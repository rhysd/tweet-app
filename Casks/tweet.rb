cask 'tweet' do
  version '0.2.3'
  sha256 'c9d7fd99ea96a0b75574e1f47cb5bbe2555a9b02a87fe9672d71869a9c612fff'

  url "https://github.com/rhysd/tweet-app/releases/download/v#{version}/Tweet-#{version}.dmg"
  appcast 'https://github.com/rhysd/tweet-app/releases.atom'
  name 'Tweet'
  homepage 'https://github.com/rhysd/tweet-app/'

  depends_on formula: 'node'

  app 'Tweet.app'
  binary "#{appdir}/Tweet.app/Contents/Resources/app/bin/cli.js", target: 'tweet'

  zap trash: [ '~/Library/Application Support/Tweet', '~/Library/Logs/Tweet' ]
end

