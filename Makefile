
PROJECT = "Corrently Node"

all: commit

dev: ;npm run dev;

commit: ;git add -A && git commit -a -m "Auto Build" && git push origin master && npm publish;

publish: ;git push origin master;
