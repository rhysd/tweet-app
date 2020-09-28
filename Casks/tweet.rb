cask 'tweet' do
  version '0.2.9'
  sha256 'bb0b910c557d7d357f82b092cf08475a07dee9b8be1407059a729a6fdfe95d37'

  url "https://github.com/rhysd/tweet-app/releases/download/v#{version}/Tweet-#{version}.dmg"
  appcast 'https://github.com/rhysd/tweet-app/releases.atom'
  name 'Tweet'
  homepage 'https://github.com/rhysd/tweet-app/'

  depends_on formula: 'node'

  app 'Tweet.app'
  binary "#{appdir}/Tweet.app/Contents/Resources/app/bin/cli.js", target: 'tweet'

  zap trash: [ '~/Library/Application Support/Tweet', '~/Library/Logs/Tweet' ]
end

