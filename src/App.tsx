import React from 'react';
import { ThemeProvider, CSSReset } from '@chakra-ui/core';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Landing, Login } from './pages';
import { Header, FullFlex } from './components';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <CSSReset />

      <FullFlex background="black">
        <BrowserRouter>
          <Header />

          <Switch>
            <Route path="/" exact={true} component={Landing} />
            <Route path="/login" component={Login} />
          </Switch>
        </BrowserRouter>
      </FullFlex>
    </ThemeProvider>
  );
};

export default App;
