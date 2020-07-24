import React from 'react';
import { Flex, Stack, Heading, Image, Button } from '@chakra-ui/core';
import { useHistory } from 'react-router-dom';

const Landing: React.FC = () => {
  const history = useHistory();

  return (
    <Flex
      flex={1}
      justify="center"
      align="center"
      textAlign="center"
      marginBottom="4rem"
      padding="3rem"
    >
      <Stack align="center" spacing={8}>
        <Image
          src={require('../assets/images/logo.svg')}
          size="8rem"
          alt="JSXC logo"
        />

        <Stack>
          <Heading as="h1" size="2xl" color="white">
            XMPP like you've
          </Heading>

          <Heading as="h1" size="2xl" color="white">
            never seen before
          </Heading>
        </Stack>

        <Button
          margin="1rem"
          border="2px"
          bg="transparent"
          color="white"
          variantColor="purple"
          onClick={() => {
            history.push('/login');
          }}
        >
          Try it out
        </Button>
      </Stack>
    </Flex>
  );
};

export default Landing;
