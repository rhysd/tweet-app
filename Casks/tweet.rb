cask 'tweet' do
  version '0.3.0'
  sha256 '9f8af59ca89841a7ee25bcacea16d8ca25aa63e9317074170a44522405376304'

  url "https://github.com/rhysd/tweet-app/releases/download/v#{version}/Tweet-#{version}.dmg"
  appcast 'https://github.com/rhysd/tweet-app/releases.atom'
  name 'Tweet'
  homepage 'https://github.com/rhysd/tweet-app/'

  depends_on formula: 'node'

  app 'Tweet.app'
  binary "#{appdir}/Tweet.app/Contents/Resources/app/bin/cli.js", target: 'tweet'

  zap trash: [ '~/Library/Application Support/Tweet', '~/Library/Logs/Tweet' ]
end

