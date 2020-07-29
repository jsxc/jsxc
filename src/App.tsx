import React from 'react';
import { ThemeProvider, CSSReset } from '@chakra-ui/core';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Landing, Login, Chats } from './pages';
import { FullFlex } from './components';
import { XmppProvider } from './hooks';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <CSSReset />

      <FullFlex background="black">
        <XmppProvider>
          <BrowserRouter>
            <Switch>
              <Route path="/" exact={true} component={Landing} />
              <Route path="/login" component={Login} />
              <Route path="/chats" component={Chats} />
            </Switch>
          </BrowserRouter>
        </XmppProvider>
      </FullFlex>
    </ThemeProvider>
  );
};

export default App;
