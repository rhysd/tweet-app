#!/bin/bash

set -e

if [ ! -d '.git' ]; then
    echo 'This script must be run at root of the repository' 2>&1
    exit 1
fi

if [[ "$1" == "" ]]; then
    echo 'Usage: update.sh {version}' 2>&1
    exit 1
fi

cd ./Casks

VERSION="$1"

echo "Update formula to version ${VERSION}"

DMG="../dist/Tweet-${VERSION}.dmg"
if [ ! -f "$DMG" ]; then
    echo "dist/Tweet-${VERSION}.dmg does not exist" 2>&1
    exit 1
fi

SHA="$(shasum -a 256 "$DMG" | cut -f 1 -d ' ')"
echo "Mac sha256: ${SHA}"
sed -i '' -E "s/  sha256 '[0-9a-f]*'/  sha256 '${SHA}'/" tweet.rb
echo "Version: ${VERSION}"
sed -i '' -E "s/  version '[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*'/  version '${VERSION}'/" tweet.rb

echo 'Done.'

