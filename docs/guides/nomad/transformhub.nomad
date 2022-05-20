job "transform-hub" {

  datacenters = ["dc1"]

  group "sth" {
    network {
      port "sth-api" { static = 8000 }
      port "runner-api" { static = 8001 }
    }

    task "transform-hub-task" {
      driver = "docker"

      config {
        image = "scramjetorg/sth:0.22.0"
        command = "sth"
        args = [
        "--id", "sth-0",
        "--runtime-adapter", "docker"
        ]

        volumes = [
          "/var/run/docker.sock:/var/run/docker.sock",
        ]

        ports = ["sth-api", "runner-api"]

        labels {
          group = "sth"
        }
      }

      env {
        SCRAMJET_TEST_LOG = "1"
        DEVELOPMENT = "1"
      }

    }
  }
}
