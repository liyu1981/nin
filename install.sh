npm install nin
mkdir -p bin
for f in `ls node_modules/.bin`; do
  ln -fs node_modules/.bin/$f bin/$f
done
