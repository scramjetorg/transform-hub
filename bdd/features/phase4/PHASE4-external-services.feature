@phase4
Feature: Phase 4 external service behavioural migrations

    @minio-s3
    Scenario: PHASE4 TC-001 S3 client and proxy use a scenario-owned MinIO service
        Given a scenario-owned MinIO S3 service is ready
        When the production S3Client streams a stored object
        Then the streamed S3 object has its original payload and content type
        When the production S3Proxy uploads, retrieves, lists, and deletes a sequence archive
        Then the S3 proxy index reflects the deleted stored sequence

    @docker-daemon
    Scenario: PHASE4 TC-002 Docker daemon lifecycle works through the production-capable client
        When I create, start, inspect, stop, read logs, and remove a scenario-labeled Docker container
        Then the Docker daemon container lifecycle completed cleanly
