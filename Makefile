
PACKAGE_VERSION=0.0.0
VERSION=0.0.1

all: service-package container

ui:
	npm run build
	rm -rf trustgraph-ui/trustgraph_ui/ui/
	cp -r packages/demo/dist/ trustgraph-ui/trustgraph_ui/ui/

service-package: ui update-package-versions
	cd trustgraph-ui && python3 setup.py sdist --dist-dir ../pkgs/

update-package-versions:
	echo __version__ = \"${PACKAGE_VERSION}\" > trustgraph-ui/trustgraph_ui/version.py

CONTAINER=docker.io/trustgraph/trustgraph-ui
DOCKER=podman

container:
	${DOCKER} build -f Containerfile -t ${CONTAINER}:${VERSION} \
	    --format docker

push:
	${DOCKER} push ${CONTAINER}:${VERSION}

docker-hub-login:
	cat docker-token.txt | \
	    docker login -u trustgraph --password-stdin registry-1.docker.io
