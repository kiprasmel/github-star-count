#!/bin/sh

DIRNAME="$(dirname $0)"
USERNAME="${USERNAME:-$(cat USERNAME)}"

WORKDIR="$DIRNAME/out/$USERNAME"

mkdir -p "$WORKDIR/diffs"

cd "$WORKDIR"
ls -1 | grep -v diffs | divvy 2 -x "diff -u %* > diffs/%0-%1.diff ||:"
cd - >/dev/null

