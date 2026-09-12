# ADR-0046: Approve production-smoke hosts independently of shared EAS URLs

- **Status**: Accepted
- **Date**: 2026-09-13
- **Deciders**: AutoTM founder, during #281 continuation

## Context

The staging and production-smoke profiles both read EAS `preview`. Its public
URL variables currently select staging, so accepting any Railway hostname lets
a production-smoke build silently target staging. #281 establishes a production
target. The founder selected the compensating host guard without a plan upgrade.

## Decision

Keep the existing EAS environment selection and fail closed for production-smoke
unless all three resolved public URL hosts match independently supplied
`PRODUCTION_SMOKE_API_HOST`, `PRODUCTION_SMOKE_WS_HOST` and
`PRODUCTION_SMOKE_MEDIA_HOST`. Operators obtain these hostnames from the production
provider domain assignments. They are build-only configuration, supplied outside
git. Never derive approvals from the resolved URLs being checked.

The existing post-install URL gate checks every endpoint before prebuild/bundling.
Approvals must be individual Railway hostnames without a scheme, port or path,
and must not contain `staging`. Resolved URLs must use the existing HTTPS/WSS
protocol contract, match their approval and contain no credentials or custom port.
Missing or mismatched approvals stop the build. The store profile retains its
stable AutoTM-owned host restriction.

## Consequences

No Expo plan change is needed for this code guard. Sharing `preview` still means
its current staging URLs cannot produce a production-smoke binary. The guard
detects that error; it does not select or rewrite URLs. Before an eventual build,
the operator must supply the intended resolved URLs and independently verify the
production domain assignments. Coordinate any shared-variable change with staging
builds and restore/verify staging configuration afterward. No remote variable
change or binary build is authorized by this ADR.

Exact matching also rejects neutral or misleading opposite-environment hostnames,
provided the independent approvals are correct. This is a configuration boundary,
not provider ownership discovery. Incorrect approvals can still select the wrong
resource, so provider readback remains a promotion gate.

## References

- [ADR-0039](0039-phased-cloud-first-hosting.md), hosting and store-domain policy
- [#281 build-environment finding](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/281#issuecomment-5555245443)
- [Mobile current state](../../apps/mobile/CONTEXT.md)
- [Expo environment variables](https://docs.expo.dev/eas/environment-variables/usage/), consulted through Context7 `/expo/expo` on 2026-09-13
