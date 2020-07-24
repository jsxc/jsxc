import React from 'react';
import { Flex, Heading, FlexProps } from '@chakra-ui/core';

type Props = FlexProps;

const Header: React.FC<Props> = (props) => {
  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      paddingX="2rem"
      paddingY="1rem"
      bg="black"
      color="white"
      {...props}
    >
      <Flex align="center" mr={5}>
        <Heading as="h1" size="lg">
          JSXC
        </Heading>
      </Flex>
    </Flex>
  );
};

export default Header;
