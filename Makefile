.PHONY: all
all: build run


.PHONY: build
build:
	yarn
	yarn vite build


.PHONY: run
run:
	docker compose up -d


.PHONY: down
down:
	docker compose down
