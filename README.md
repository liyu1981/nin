nin
===

nin is Node INstaller, the missing nodejs app deploy tool.

nin tries to solve the trival problem: how to deploy your nodejs app ?

### The manual method

When I manually deploy a nodejs app, I do

1. Copy the project dir (as well as all files) to deployment site.
2. Change to that dir, `npm install` all my dependencies.
3. After that, manually do some setup things, such as `bash sth.sh` or `grunt`.
4. Finally start the app with `node index.js` or even `forever index.js`.

**So why not to make some tool to speed up this process?**

That is what nin do.

### The nin method

Suppose you have your project in `/path/to/yourapp` or `git://github.com/yourname/yourapp.git`,

1. `mkdir yourapp_deploy; cd yourapp_deploy`
2. `nin deploy /path/to/yourapp` or `nin deploy git://github.com/yourname/yourapp.git`

Done. All previous steps will be nicely covered by nin.
