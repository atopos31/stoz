.PHONY: image
image:
	docker build --platform linux/amd64 -t stoz:latest . && docker save stoz:latest -o ./stoz-image-x86_64.tar