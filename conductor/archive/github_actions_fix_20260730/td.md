# Deferred Track Items

## docker-hub-post-npm-release-images

- **Status:** deferred by user direction
- **Scope:** Follow-up track
- **Decision:** Do not implement Docker Hub image publishing in this GitHub Actions replacement track.
- **Required follow-up:** Design a trusted post-npm-release Docker Hub image workflow that builds supported images from verified published npm packages, preserves release/image alignment, pins all inputs, and defines image consumer migration/retention behavior.
- **Reason:** Docker Hub publication is not an explicit requirement of the approved specification; retaining the legacy implementation would reintroduce Node 18, Yarn, mutable actions, and long-lived credentials.
- **Evidence:** User direction received during Phase 6 after destructive-cleanup review.
