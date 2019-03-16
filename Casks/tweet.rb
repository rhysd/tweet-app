cask 'tweet' do
  version '0.2.2'
  sha256 '9e0694b2c4cf4fb6c8f0dac566c14674ed5b5691a593d7036f9843a8ac25f5a6'

  url "https://github.com/rhysd/tweet-app/releases/download/v#{version}/Tweet-#{version}.dmg"
  appcast 'https://github.com/rhysd/tweet-app/releases.atom'
  name 'Tweet'
  homepage 'https://github.com/rhysd/tweet-app/'

  depends_on node: true

  app 'Tweet.app'
  binary "#{appdir}/Tweet.app/Contents/Resources/app/bin/cli.js", target: 'tweet'

  zap trash: [ '~/Library/Application Support/Tweet', '~/Library/Logs/Tweet' ]
end

