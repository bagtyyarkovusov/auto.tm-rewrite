TAG ?= dev-$(shell git rev-parse --short HEAD)
SERVICES = api worker admin web sms-gateway

# Fail on the first failed image build and when `docker save` fails inside the
# `| gzip` pipe. With the default `sh -c`, a failed build in the loop or in the
# pipe left a green run and a near-empty tarball.
SHELL := /bin/bash
.SHELLFLAGS := -eo pipefail -c

.PHONY: build bundle load deploy rollback

build:
	@for svc in $(SERVICES); do \
		echo "Building auto-tm/$$svc:$(TAG)"; \
		docker build -f infra/docker/$$svc.Dockerfile -t auto-tm/$$svc:$(TAG) .; \
	done

bundle: build
	@mkdir -p images
	@docker save \
		$(foreach svc,$(SERVICES),auto-tm/$(svc):$(TAG)) \
		| gzip > images/auto-tm-$(TAG).tar.gz
	@echo "Bundle: images/auto-tm-$(TAG).tar.gz ($$(du -h images/auto-tm-$(TAG).tar.gz | cut -f1))"

load:
	@test -n "$(BUNDLE)" || (echo "Usage: make load BUNDLE=path/to/auto-tm-vX.tar.gz" && exit 1)
	gunzip -c $(BUNDLE) | docker load

deploy:
	@test -n "$(TAG)" || (echo "Usage: make deploy TAG=vX.Y.Z" && exit 1)
	TAG=$(TAG) docker compose -f infra/compose/docker-compose.prod.yml up -d

rollback:
	@test -n "$(TAG)" || (echo "Usage: make rollback TAG=vX.Y.Z" && exit 1)
	TAG=$(TAG) docker compose -f infra/compose/docker-compose.prod.yml up -d
