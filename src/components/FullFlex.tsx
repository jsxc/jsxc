import React from 'react';
import { Flex, FlexProps } from '@chakra-ui/core';

type Props = FlexProps;

const FullFlex: React.FC<Props> = (props) => {
  const { children, ...rest } = props;

  return (
    <Flex
      direction="column"
      height="100vh"
      width="100vw"
      overflow="auto"
      {...rest}
    >
      {children}
    </Flex>
  );
};

export default FullFlex;
