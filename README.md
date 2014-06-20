nin
===

nin is **N**ode **IN**staller, the missing nodejs app deploy tool.

nin tries to solve a trival-but-bother problem: **how to deploy your nodejs app ?**

[![ScreenShot](https://github.com/liyu1981/nin/raw/gh-pages/images/nin.png)](http://liyu1981.github.io/nin/slides/intro/index.html)

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

Suppose you have your project in `/path/to/yourapp` or `git://github.com/yourname/yourapp.git`, with your `nin.json` conf file well prepared,

1. `mkdir yourapp_deploy; cd yourapp_deploy`
2. `nin install /path/to/yourapp` or `nin install git://github.com/yourname/yourapp.git`

Done. You app is installed and configured by nin.

Then you can `nin start yourapp` to start it or `nin stop yourapp` to stop it.

Installation
============

```bash
npm install -g nin
```

Dependencies
============

* nodejs `>0.10.0`
* npm `>1.4.0`

Command Line Summary
====================

```
  Usage: nin [options] [command]

  Commands:

    deploy <pkg>           Install your app.
      > <pkg> can be any llegal npm pkg names.
      > Ref https://www.npmjs.org/doc/cli/npm-install.html

    install <pkg>          Install your app.
      > This equals deploy then setup.
      > <pkg> can be any llegal npm pkg names.
      > Ref https://www.npmjs.org/doc/cli/npm-install.html

    setup <pkgname>        Setup your app.
      > <pkgname> is the pkg installed dir name, i.e., some name in <cwd>/node_modules/

    start <pkgname>        Start your app.
      > <pkgname> is the pkg installed dir name, i.e., some name in <cwd>/node_modules/
      > pid file will write to var/<pkgname>

    stop <pkgname>         Stop your app.
      > <pkgname> is the pkg installed dir name, i.e., some name in <cwd>/node_modules/

    version                Show version info.

  Options:

    -h, --help   output usage information
    -q, --quiet  turn on quiet mode
```

nin.json
========

`nin.json` is the configuration file of your app, which contains the intructions on how to setup/start/stop your app. It should be placed in the root dir (like `package.json`). The format is

```json
{
  "setup": [
    { "type": "...", "content": "..." },
    ...
  ],
  "start": [
    { "type": "...", "content": "..." },
    ...
  ],
  "stop": [
    { "type": "...", "content": "..." },
    ...
  ]
}
```

### setup

* `type` can be `bash|grunt`
* `content` is the relative path to your script/file.

### start/stop

* `type` can be `bash|forever`
* `content` is the relative path to your script/file.

Project Example
===============

Nothing can compared to an example. Check [nin-example](https://github.com/liyu1981/nin-example) for different settings(in different git branch) of nin.
