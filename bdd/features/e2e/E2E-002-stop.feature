Feature: Stop e2e tests

    Scenario: E2E-002 TC-001 Stop sequence process after 0s canKeepAlive true
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        And wait "2000" ms
        And send stop message with timeout "0" and canKeepAlive "true"
        And wait "4000" ms
        Then host one process is stopped

    Scenario: E2E-002 TC-002 Stop sequence process after 0s canKeepAlive false
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        And wait "2000" ms
        And send stop message with timeout "0" and canKeepAlive "false"
        And wait "4000" ms
        Then host one process is stopped

    #sequence process exited with code:  1  and signal:  null
    #issue created: https://github.com/scramjet-cloud-platform/scramjet-csi-dev/issues/201
    Scenario: E2E-002 TC-003 Stop sequence after 4s
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        And wait "2000" ms
        And send stop message with timeout "4000" and canKeepAlive "true"
        And wait "3000" ms
        Then host one process is working
        And wait "5000" ms
        And host one process is stopped
