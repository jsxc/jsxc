.PHONY: all install
all: install .github.json
	grunt build
install:
	git submodule update --init
	npm install
	bower install
# Does not exist on normal machines, create dummy
.github.json:
	echo '{}' > .github.json
