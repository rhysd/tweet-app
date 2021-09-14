<a name="v0.3.3"></a>
# [v0.3.3](https://github.com/rhysd/tweet-app/releases/tag/v0.3.3) - 14 Sep 2021

- Update many dependencies to the latest, including Electron from v12 to v14.
- Fix backing to a tweet input form page after sending a tweet. Previously tweet-app hooked `/i/api/1.1/statuses/update` but this API is no longer used by Twitter. Instead, now `/i/api/graphql/*/CreateTweet` GraphQL API is hooked.

[Changes][v0.3.3]


<a name="v0.3.2"></a>
# [v0.3.2](https://github.com/rhysd/tweet-app/releases/tag/v0.3.2) - 24 May 2021

- Fix unnecessary files were included in a released npm package
- Check network state at launching app and show 'Offline' page without trying to load twitter.com
- Use `contents.setWindowOpenHandler` to deny making a new window instead of deprecated `new-window` event
- Improve log message on denying permission requests

[Changes][v0.3.2]


<a name="v0.3.1"></a>
# [v0.3.1](https://github.com/rhysd/tweet-app/releases/tag/v0.3.1) - 20 May 2021

- **Improve:** Update Electron to v12 and other dependencies
- **Fix:** Crash when app quits with the latest Electron
- **Dev:** Replace percel bundler with esbuild bundler
- **Dev:** Migrate CI from Travis CI and AppVeyor to GitHub Actions

[Changes][v0.3.1]


<a name="v0.3.0"></a>
# [v0.3.0](https://github.com/rhysd/tweet-app/releases/tag/v0.3.0) - 27 Jan 2021

- **Fix:** Critical issue that sending tweet does not go back to tweet page again.
- **New:** Add support for 'Unsent Tweets' feature. Selecting 'Cancel Tweet' application menu item in 'Edit' menu will open 'Discard' or 'Save' dialog in tweet page. Clicking 'Save' button saves current text as draft. You can restore the text from 'Unsent Tweets' link in tweet page.
- **Improve:** Update dependencies including the latest Electron v11.2
- **Improve:** Add more unit tests

[Changes][v0.3.0]


<a name="v0.2.9"></a>
# [v0.2.9](https://github.com/rhysd/tweet-app/releases/tag/v0.2.9) - 28 Sep 2020

Maintenance updates. No new features.

- Update Electron from v8.2 to v10.1
- Update many npm dependencies including security patches

[Changes][v0.2.9]


<a name="v0.2.7"></a>
# [v0.2.7](https://github.com/rhysd/tweet-app/releases/tag/v0.2.7) - 06 May 2020

- Migrate Electron from v7 to v8.2
- Update many dependencies including security fixes

[Changes][v0.2.7]


<a name="v0.2.6"></a>
# [v0.2.6](https://github.com/rhysd/tweet-app/releases/tag/v0.2.6) - 25 Dec 2019

- Migrate to Electron v7
- Update many dependencies

[Changes][v0.2.6]


<a name="v0.2.5"></a>
# [v0.2.5](https://github.com/rhysd/tweet-app/releases/tag/v0.2.5) - 08 Aug 2019

- Migrate to Electron v6
- Add small security fix for dependency

[Changes][v0.2.5]


<a name="v0.2.4"></a>
# [v0.2.4](https://github.com/rhysd/tweet-app/releases/tag/v0.2.4) - 11 Jun 2019

- Add 'Unlink auto links` context menu on selecting text in tweet form. It removes annoying auto links in tweet by inserting zero width space.

[Changes][v0.2.4]


<a name="v0.2.3"></a>
# [v0.2.3](https://github.com/rhysd/tweet-app/releases/tag/v0.2.3) - 01 May 2019

- Update many dependencies for stability and security
  - Mainly for Electron v5
  - Use better TypeScript configuration
  - Use new eslint rules

[Changes][v0.2.3]


<a name="v0.2.2"></a>
# [v0.2.2](https://github.com/rhysd/tweet-app/releases/tag/v0.2.2) - 16 Mar 2019

- Large dependencies update
  - Update Electron to 4.1.0
  - Address security alert in dev-dependencies

[Changes][v0.2.2]


<a name="v0.2.1"></a>
# [v0.2.1](https://github.com/rhysd/tweet-app/releases/tag/v0.2.1) - 05 Mar 2019

- Prepare formula script for homebrew-cask. Now it's much easier to manage this app on macOS
- Allow to use app executable as node using `$ELECTRON_RUN_AS_NODE` environment variable
- Blur application focus after closing window on macOS
- Consider dark theme on covering window with element
- Add `window.auto_hide_menu_bar` config value to control menu behavior on Windows and Linux
- Use eslint and prettier for linting/formatting sources

[Changes][v0.2.1]


<a name="v0.2.0"></a>
# [v0.2.0](https://github.com/rhysd/tweet-app/releases/tag/v0.2.0) - 02 Mar 2019

- Detect network is not available and show it in window. When network is back to available, window will be refreshed automatically
- Add 'Open Previous Tweet' menu item which opens the last posted tweet's page in window
  - You can delete the tweet from the page
- Do not use frameless window on Windows and Linux since `-webkit-app-region` totally disables clicks
- Fix permission request handler to ask user to accept/reject the permission request
- Disable `Esc` key down since it navigates to home timeline when tweet form having focus
- `.deb` release is added for Linux
- CI on Windows

[Changes][v0.2.0]


<a name="v0.1.0"></a>
# [v0.1.0](https://github.com/rhysd/tweet-app/releases/tag/v0.1.0) - 26 Feb 2019

 First beta release

[Changes][v0.1.0]


[v0.3.3]: https://github.com/rhysd/tweet-app/compare/v0.3.2...v0.3.3
[v0.3.2]: https://github.com/rhysd/tweet-app/compare/v0.3.1...v0.3.2
[v0.3.1]: https://github.com/rhysd/tweet-app/compare/v0.3.0...v0.3.1
[v0.3.0]: https://github.com/rhysd/tweet-app/compare/v0.2.9...v0.3.0
[v0.2.9]: https://github.com/rhysd/tweet-app/compare/v0.2.7...v0.2.9
[v0.2.7]: https://github.com/rhysd/tweet-app/compare/v0.2.6...v0.2.7
[v0.2.6]: https://github.com/rhysd/tweet-app/compare/v0.2.5...v0.2.6
[v0.2.5]: https://github.com/rhysd/tweet-app/compare/v0.2.4...v0.2.5
[v0.2.4]: https://github.com/rhysd/tweet-app/compare/v0.2.3...v0.2.4
[v0.2.3]: https://github.com/rhysd/tweet-app/compare/v0.2.2...v0.2.3
[v0.2.2]: https://github.com/rhysd/tweet-app/compare/v0.2.1...v0.2.2
[v0.2.1]: https://github.com/rhysd/tweet-app/compare/v0.2.0...v0.2.1
[v0.2.0]: https://github.com/rhysd/tweet-app/compare/v0.1.0...v0.2.0
[v0.1.0]: https://github.com/rhysd/tweet-app/tree/v0.1.0

 <!-- Generated by changelog-from-release -->
