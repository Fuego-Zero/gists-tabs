import React from 'react';

import logo from '../../../assets/img/logo.svg';
// import Greetings from '../../containers/Greetings/Greetings';

import './Popup.scss';

const Popup = () => (
  <div className="App">
    <header className="App-header">
      <img alt="logo" className="App-logo" src={logo} />
      <p>
        Edit <code>src/pages/Popup/Popup.jsx</code> and save to reload.
      </p>
      <a className="App-link" href="https://reactjs.org" rel="noopener noreferrer" target="_blank">
        Learn React!
      </a>
    </header>
  </div>
);

export default Popup;
