Feature: Stop e2e tests

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-002 TC-001 Stop sequence process after 0s canKeepAlive true
        Given file "data.json" exists on hard drive
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        And wait "2000" ms
        And send stop message with timeout "0" and canKeepAlive "true"
        And wait "4000" ms
        Then host one process is stopped

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-002 TC-002 Stop sequence process after 0s canKeepAlive false
        Given file "data.json" exists on hard drive
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        And wait "2000" ms
        And send stop message with timeout "0" and canKeepAlive "false"
        And wait "4000" ms
        Then host one process is stopped

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-002 TC-003 Stop sequence after 4s
        Given file "data.json" exists on hard drive
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        And wait "2000" ms
        And send stop message with timeout "4000" and canKeepAlive "true"
        And wait "3000" ms
        Then host one process is working
        And wait "5000" ms
        And host one process is stopped
    #sequence process exited with code:  1  and signal:  null
    #issue created: https://github.com/scramjet-cloud-platform/scramjet-csi-dev/issues/201

    Scenario: E2E-002 TC-004 Stop instance process after 0s canKeepAlive true
        Given host started
        And host process is working
        When sequence "../packages/samples/hello-alice-out.tar.gz" loaded
        And wait for "4000" ms
        Then instance started with arguments "/package/data.json"
        And wait for "4000" ms
        # Then instance is working
        And send stop message to instance with arguments timeout 0 and canCallKeepAlive "true"
        And wait "4000" ms
        # Then instance is stopped/killed
        Then host stops

    Scenario: E2E-002 TC-005 Stop instance process after 0s canKeepAlive false
        Given host started
        And host process is working
        When sequence "../packages/samples/hello-alice-out.tar.gz" loaded
        And wait for "4000" ms
        Then instance started with arguments "/package/data.json"
        And wait for "4000" ms
        # Then instance is working
        And send stop message to instance with arguments timeout 0 and canCallKeepAlive "false"
        And wait for "4000" ms
        # Then instance is stopped/killed
        Then host stops

    Scenario: E2E-002 TC-006 Stop instance process after 4s canKeepAlive true
        Given host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/samples/hello-alice-out.tar.gz" loaded
        And wait for "4000" ms
        Then instance started with arguments "/package/data.json"
        And wait for "4000" ms
        When get instance health
        Then instance response body is "{\"healthy\":true}"
        And send stop message to instance with arguments timeout 8000 and canCallKeepAlive "true"
        And wait for "4000" ms
        When get instance health
        Then instance response body is "{\"healthy\":true}"
        And wait for "4000" ms
        # Then instance is stopped/killed
        # And wait for "4000" ms
        Then host stops
