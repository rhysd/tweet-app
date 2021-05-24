cask 'tweet' do
  version '0.3.2'
  sha256 '44e9544c5ae1d54b9ec86c625cb451759e69f468907a8c5396adc98e77de8610'

  url "https://github.com/rhysd/tweet-app/releases/download/v#{version}/Tweet-#{version}.dmg"
  appcast 'https://github.com/rhysd/tweet-app/releases.atom'
  name 'Tweet'
  homepage 'https://github.com/rhysd/tweet-app/'

  depends_on formula: 'node'

  app 'Tweet.app'
  binary "#{appdir}/Tweet.app/Contents/Resources/app/bin/cli.js", target: 'tweet'

  zap trash: [ '~/Library/Application Support/Tweet', '~/Library/Logs/Tweet' ]
end

