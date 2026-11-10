SHELL := /bin/bash

IMAGE := ghcr.io/akbarryyan/whuzpay-frontend
# The VPS is x86_64. Add linux/arm64 here only when needed: under QEMU emulation
# `next build` is very slow.
PLATFORMS := linux/amd64
# Inlined into the browser bundle at build time (see Dockerfile).
API_URL := https://api.whuzpay.web.id

.PHONY: release

# Build + push to GHCR (requires `docker login ghcr.io` with a write:packages
# PAT). Run from front/. Tags are never overwritten: bump VERSION.
release:
	@if [ -z "$(VERSION)" ]; then \
		echo "usage: make release VERSION=x.y.z" >&2; \
		exit 1; \
	fi
	@if ! [[ "$(VERSION)" =~ ^[0-9]+\.[0-9]+\.[0-9]+$$ ]]; then \
		echo "VERSION must be x.y.z (got: $(VERSION))" >&2; \
		exit 1; \
	fi
	@if docker buildx imagetools inspect $(IMAGE):$(VERSION) >/dev/null 2>&1; then \
		echo "$(IMAGE):$(VERSION) already exists — tags are never overwritten; bump VERSION" >&2; \
		exit 1; \
	fi
	docker buildx build --platform $(PLATFORMS) \
		--build-arg VERSION=$(VERSION) --build-arg NEXT_PUBLIC_API_URL=$(API_URL) \
		-t $(IMAGE):$(VERSION) --push .
