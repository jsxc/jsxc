all: install
	grunt build
install:
	git submodule update --init
	npm install
	bower install
