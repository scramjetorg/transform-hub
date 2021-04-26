Feature: Sample e2e tests

    Scenario: Execute example HelloAlice
        Given input file containing data "data.json"
        When host one execute sequence "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt" and redirects output to "dataOut.test.result.txt"
        Then file "dataOut.test.result.txt" is generated
        And file "dataOut.test.result.txt" in each line contains "Hello " followed by name from file "data.json" finished by "!"

    Scenario: Get monitoring from sequence, should return default monitoring value: healthy true
        Given host one execute sequence in background "../packages/reference-apps/healthy-sequence.tar.gz"
        And wait "3000" ms
        When get sequence health
        Then response body is "{\"healthy\":true}"
        And wait "3000" ms
        And host one process is stopped

    Scenario: Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host one execute sequence in background "../packages/reference-apps/unhealthy-sequence.tar.gz"
        And wait "3000" ms
        When get sequence health
        Then response body is "{\"healthy\":false}"
        And wait "3000" ms
        And host one process is stopped

    Scenario: Stop sequence process after 0s
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And wait "3000" ms
        And send stop message with timeout "0" and canKeepAlive "true"
        And wait "4000" ms
        Then host one process is stopped

    Scenario: Stop sequence after 4s
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And wait "300" ms
        And send stop message with timeout "4000" and canKeepAlive "true"
        And wait "3000" ms
        Then host one process is working
        And wait "5000" ms
        And host one process is stopped

    Scenario: Send test-event through API and get event emitted by sequence
        Given host one execute sequence in background "../packages/reference-apps/event-sequence.tar.gz"
        And wait "300" ms
        And host one process is working
        When send event "test-event" to sequence with message "test message"
        And wait "5000" ms
        Then get event from sequence
        And response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"
        And wait "5000" ms
        And host one process is stopped
