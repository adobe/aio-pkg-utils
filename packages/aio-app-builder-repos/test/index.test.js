  const metadata = require('../index')

  test('defaultHost', () => {
    expect(metadata.defaultHost).toEqual('https://github.com')
  })

  test('defaultJiraProject', () => {
    expect(metadata.defaultJiraProject).toEqual('ACNA')
  })

  test('repos array', () => {
    expect(Array.isArray(metadata.repos)).toEqual(true)
  })

  test('each repo array item must have a \'repo\' property', () => {
    metadata.repos.forEach(item => expect(item.repo).toBeDefined())
  })
  
