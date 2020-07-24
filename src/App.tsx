import React from 'react';
import { ThemeProvider } from '@chakra-ui/core';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Landing, Login } from './pages';
import { Header } from './components';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Header />

        <Switch>
          <Route path="/" exact={true} component={Landing} />
          <Route path="/login" component={Login} />
        </Switch>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
