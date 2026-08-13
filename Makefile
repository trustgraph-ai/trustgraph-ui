
PACKAGE_VERSION=0.0.0
VERSION=0.0.1

all: service-package container

ui:
	npm run build
	rm -rf trustgraph-ui/trustgraph_ui/ui/
	cp -r packages/portal/dist/ trustgraph-ui/trustgraph_ui/ui/

service-package: ui update-package-versions
	cd trustgraph-ui && pip wheel -w ../pkgs/ --no-deps .

update-package-versions:
	sed -i 's/^version = .*/version = "${PACKAGE_VERSION}"/' trustgraph-ui/pyproject.toml

CONTAINER_BASE=docker.io/trustgraph
DOCKER=podman

# Single-arch local build
container-%: update-package-versions
	${DOCKER} build \
	    -f containers/Containerfile.${@:container-%=%} \
	    -t ${CONTAINER_BASE}/trustgraph-${@:container-%=%}:${VERSION} .

container: container-ui

# Multi-arch: build both platforms sequentially into one manifest (local use)
manifest-%: update-package-versions
	-@${DOCKER} manifest rm \
	    ${CONTAINER_BASE}/trustgraph-${@:manifest-%=%}:${VERSION}
	${DOCKER} build --platform linux/amd64,linux/arm64 \
	    -f containers/Containerfile.${@:manifest-%=%} \
	    --manifest \
	    ${CONTAINER_BASE}/trustgraph-${@:manifest-%=%}:${VERSION} .

# Multi-arch: build a single platform image (for parallel CI)
platform-%-amd64: update-package-versions
	${DOCKER} build --platform linux/amd64 \
	    -f containers/Containerfile.${@:platform-%-amd64=%} \
	    -t ${CONTAINER_BASE}/trustgraph-${@:platform-%-amd64=%}:${VERSION}-amd64 .

platform-%-arm64: update-package-versions
	${DOCKER} build --platform linux/arm64 \
	    -f containers/Containerfile.${@:platform-%-arm64=%} \
	    -t ${CONTAINER_BASE}/trustgraph-${@:platform-%-arm64=%}:${VERSION}-arm64 .

# Push a single platform image
push-platform-%-amd64:
	${DOCKER} push \
	    ${CONTAINER_BASE}/trustgraph-${@:push-platform-%-amd64=%}:${VERSION}-amd64

push-platform-%-arm64:
	${DOCKER} push \
	    ${CONTAINER_BASE}/trustgraph-${@:push-platform-%-arm64=%}:${VERSION}-arm64

# Combine per-platform images into a multi-arch manifest
combine-manifest-%:
	-@${DOCKER} manifest rm \
	    ${CONTAINER_BASE}/trustgraph-${@:combine-manifest-%=%}:${VERSION}
	${DOCKER} manifest create \
	    ${CONTAINER_BASE}/trustgraph-${@:combine-manifest-%=%}:${VERSION} \
	    docker://${CONTAINER_BASE}/trustgraph-${@:combine-manifest-%=%}:${VERSION}-amd64 \
	    docker://${CONTAINER_BASE}/trustgraph-${@:combine-manifest-%=%}:${VERSION}-arm64
	${DOCKER} manifest push \
	    ${CONTAINER_BASE}/trustgraph-${@:combine-manifest-%=%}:${VERSION}

# Push a container (single-arch)
push-container-%:
	${DOCKER} push \
	    ${CONTAINER_BASE}/trustgraph-${@:push-container-%=%}:${VERSION}

# Push a manifest (from local multi-arch build)
push-manifest-%:
	${DOCKER} manifest push \
	    ${CONTAINER_BASE}/trustgraph-${@:push-manifest-%=%}:${VERSION}

push: push-container-ui

docker-hub-login:
	cat docker-token.txt | \
	    ${DOCKER} login -u trustgraph --password-stdin registry-1.docker.io
