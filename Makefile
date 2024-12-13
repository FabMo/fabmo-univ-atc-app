
dist/fabmo-univ-atc-app.fma: clean node-modules *.html js/*.js js/lib/*.js tests/*.js tests/sbp/*.sbp tests/images/*.jpg css/*.css icon.png images/*.png images/*.jpg package.json
	mkdir -p dist
	zip dist/fabmo-atc-app.fma *.html js/*.js js/lib/*.js css/*.css tests/*.js tests/sbp/*.sbp tests/images/*.jpg images/*.png images/*.jpg icon.png package.json
	zip dist/fabmo-atc-app.fma -r node_modules/font-awesome/css node_modules/font-awesome/fonts node_modules/bulma/css

node-modules:
	npm install

.PHONY: clean node-modules

clean:
	rm -rf dist
