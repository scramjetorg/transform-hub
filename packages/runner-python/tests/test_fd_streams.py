import fcntl
import os
import queue
import select
from contextlib import contextmanager
from dataclasses import dataclass
from threading import Thread

import runner_python.fd_streams as fd_streams  # pyright: ignore[reportMissingImports]


@dataclass(slots=True)
class WiredFds:
    stdin_writer: int
    stdout_reader: int
    stderr_reader: int
    control_writer: int
    monitoring_reader: int
    fd3_stat: os.stat_result


def _safe_dup(fd: int) -> int:
    return fcntl.fcntl(fd, fcntl.F_DUPFD, 20)


def _close_fd(fd: int | None) -> None:
    if fd is None:
        return

    try:
        os.close(fd)
    except OSError:
        pass


def _close_streams(streams: fd_streams.FdStreams) -> None:
    for stream in (
        streams.monitoring_out,
        streams.control_in,
        streams.stderr,
        streams.stdout,
        streams.stdin,
    ):
        try:
            stream.close()
        except OSError:
            pass


@contextmanager
def wire_runner_fds():
    saved_fds = {}
    source_fds = []
    peer_fds = []

    for fd in range(6):
        try:
            saved_fds[fd] = os.dup(fd)
        except OSError:
            saved_fds[fd] = None

    stdin_r = stdin_w = None
    stdout_r = stdout_w = None
    stderr_r = stderr_w = None
    ipc_r = ipc_w = None
    control_r = control_w = None
    monitoring_r = monitoring_w = None

    try:
        stdin_r, stdin_w = os.pipe()
        stdout_r, stdout_w = os.pipe()
        stderr_r, stderr_w = os.pipe()
        ipc_r, ipc_w = os.pipe()
        control_r, control_w = os.pipe()
        monitoring_r, monitoring_w = os.pipe()

        source_fds = [
            _safe_dup(stdin_r),
            _safe_dup(stdout_w),
            _safe_dup(stderr_w),
            _safe_dup(ipc_r),
            _safe_dup(control_r),
            _safe_dup(monitoring_w),
        ]

        for target_fd, source_fd in enumerate(source_fds):
            os.dup2(source_fd, target_fd)

        peer_fds = [stdin_w, stdout_r, stderr_r, control_w, monitoring_r]

        yield WiredFds(
            stdin_writer=stdin_w,
            stdout_reader=stdout_r,
            stderr_reader=stderr_r,
            control_writer=control_w,
            monitoring_reader=monitoring_r,
            fd3_stat=os.fstat(3),
        )
    finally:
        for fd in range(6):
            saved_fd = saved_fds.get(fd)
            if saved_fd is None:
                _close_fd(fd)
                continue

            try:
                os.dup2(saved_fd, fd)
            except OSError:
                pass

        for fd in source_fds:
            _close_fd(fd)

        for fd in peer_fds:
            _close_fd(fd)

        for fd in (
            stdin_r,
            stdout_w,
            stderr_w,
            ipc_r,
            ipc_w,
            control_r,
            monitoring_w,
        ):
            _close_fd(fd)

        for saved_fd in saved_fds.values():
            _close_fd(saved_fd)


@contextmanager
def open_streams():
    with wire_runner_fds() as wired_fds:
        streams = fd_streams.open_fd_streams()
        try:
            yield wired_fds, streams
        finally:
            _close_streams(streams)


def test_open_fd_streams_returns_expected_attributes_and_fds(monkeypatch):
    real_fdopen = os.fdopen
    opened_fds = []

    def spy_fdopen(fd: int, *args, **kwargs):
        opened_fds.append(fd)
        return real_fdopen(fd, *args, **kwargs)

    monkeypatch.setattr(fd_streams.os, "fdopen", spy_fdopen)

    with wire_runner_fds():
        streams = fd_streams.open_fd_streams()
        try:
            assert isinstance(streams, fd_streams.FdStreams)
            assert streams.stdin.fileno() == 0
            assert streams.stdout.fileno() == 1
            assert streams.stderr.fileno() == 2
            assert streams.control_in.fileno() == 4
            assert streams.monitoring_out.fileno() == 5

            assert hasattr(streams, "stdin")
            assert hasattr(streams, "stdout")
            assert hasattr(streams, "stderr")
            assert hasattr(streams, "control_in")
            assert hasattr(streams, "monitoring_out")

            assert opened_fds == [0, 1, 2, 4, 5]
        finally:
            _close_streams(streams)


def test_control_in_is_readable_and_monitoring_out_is_writable():
    with open_streams() as (_, streams):
        assert streams.control_in.readable()
        assert streams.monitoring_out.writable()


def test_fd3_is_left_untouched(monkeypatch):
    real_fdopen = os.fdopen
    opened_fds = []

    def spy_fdopen(fd: int, *args, **kwargs):
        opened_fds.append(fd)
        return real_fdopen(fd, *args, **kwargs)

    monkeypatch.setattr(fd_streams.os, "fdopen", spy_fdopen)

    with wire_runner_fds() as wired_fds:
        streams = fd_streams.open_fd_streams()
        try:
            fd3_stat_after = os.fstat(3)
            assert (wired_fds.fd3_stat.st_dev, wired_fds.fd3_stat.st_ino) == (
                fd3_stat_after.st_dev,
                fd3_stat_after.st_ino,
            )
            assert 3 not in opened_fds
        finally:
            _close_streams(streams)


def test_monitoring_out_write_frame_flushes_immediately():
    with open_streams() as (wired_fds, streams):
        streams.monitoring_out.write_frame(b"PING")

        readable, _, _ = select.select([wired_fds.monitoring_reader], [], [], 0)
        assert readable == [wired_fds.monitoring_reader]
        assert os.read(wired_fds.monitoring_reader, 1024) == b"PING\r\n"


def test_partial_frames_on_fd4_are_buffered_until_crlf():
    with open_streams() as (wired_fds, streams):
        results: queue.Queue[bytes] = queue.Queue()

        reader = Thread(
            target=lambda: results.put(streams.control_in.readline_crlf()),
            daemon=True,
        )
        reader.start()

        os.write(wired_fds.control_writer, b"hello")
        reader.join(timeout=0.05)
        assert reader.is_alive()

        os.write(wired_fds.control_writer, b"-")
        reader.join(timeout=0.05)
        assert reader.is_alive()

        os.write(wired_fds.control_writer, b"world\r\n")
        reader.join(timeout=1)

        assert not reader.is_alive()
        assert results.get_nowait() == b"hello-world"


def test_control_in_readline_crlf_returns_complete_line_without_crlf():
    with open_streams() as (wired_fds, streams):
        os.write(wired_fds.control_writer, b"status ok\r\n")
        assert streams.control_in.readline_crlf() == b"status ok"


def test_monitoring_out_write_frame_appends_crlf():
    with open_streams() as (wired_fds, streams):
        streams.monitoring_out.write_frame(b"metric 1")
        assert os.read(wired_fds.monitoring_reader, 1024) == b"metric 1\r\n"
