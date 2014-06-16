nin
===

nin is Node INstaller, the missing nodejs app deploy tool.

nin tries to solve a trival-but-bother problem:

**how to deploy your nodejs app ?**

### The manual method

When I manually deploy a nodejs app, I do

1. Copy the project pkg and extract all files to deployment site `dir`.
2. Change to that `dir`, `npm install` all my dependencies.
3. After that, manually do some setup things, such as `bash sth.sh` or `grunt`.
4. Finally start the app with `node index.js` or even `forever index.js`. (In this step I usually save my app's `pid` in some file for future.)
5. And when there is a need, I stop the app with `pid` saved before.

**So why not to make some tool to automate that process?**

That is what nin do.

### The nin method

Suppose you have your project in `/path/to/yourapp` or `git://github.com/yourname/yourapp.git`,

1. `mkdir yourapp_deploy; cd yourapp_deploy`
2. `nin deploy /path/to/yourapp` or `nin deploy git://github.com/yourname/yourapp.git`

Done. You app is installed and configured by nin.

Then you can `nin start yourapp` to start it or `nin stop yourapp` to stop it.
