echo "npm install nin in localhost dir..."
npm install --silent nin
echo "done."
echo "now link the bin utils..."
mkdir -p bin
cwd=`pwd`
for f in `ls $cwd/node_modules/.bin`; do
  echo "linking util: $f"
  rm -rf bin/$f
  ln -fs $cwd/node_modules/.bin/$f bin/$f
done
echo "done. Bye."
