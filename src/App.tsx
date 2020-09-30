import React from 'react';
import {
  theme as defaultTheme,
  ThemeProvider,
  CSSReset,
} from '@chakra-ui/core';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Landing, Login, Chats } from './pages';
import { FullFlex } from './components';
import { XmppProvider } from './hooks';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
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

const theme = {
  ...defaultTheme,
  fonts: {
    heading: 'Space Mono, sans-serif',
    body: 'Space Mono, sans-serif',
    mono: 'Space Mono, sans-serif',
  },
};

export default App;
