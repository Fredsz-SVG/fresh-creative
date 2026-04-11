const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { default: FilerobotImageEditor } = require('react-filerobot-image-editor');

const html = ReactDOMServer.renderToString(
  React.createElement(FilerobotImageEditor, { source: 'empty', TABS: [], TOOLS: [] })
);
console.log(html);
