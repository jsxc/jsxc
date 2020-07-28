import React from 'react';
import {
  Flex,
  Stack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Button,
} from '@chakra-ui/core';
import { useForm } from 'react-hook-form';
import { useXmpp, Credentials } from '../hooks';
import { match, isValidUrl } from '../utilities';

const Login: React.FC = () => {
  const [, globalDispatch] = useXmpp();
  const { formState, errors, register, handleSubmit } = useForm();

  const validateUrl = (value: string) => {
    return match<string, string | boolean>(value)
      .when(
        (value) => !value,
        () => 'Required',
      )
      .when(
        (value) => !isValidUrl(value),
        () => 'Invalid URL',
      )
      .otherwise(() => true);
  };

  const validateUsername = (value: string) => {
    return match<string, string | boolean>(value)
      .when(
        (value) => !value,
        () => 'Required',
      )
      .otherwise(() => true);
  };

  const validatePassword = (value: string) => {
    return match<string, string | boolean>(value)
      .when(
        (value) => !value,
        () => 'Required',
      )
      .otherwise(() => true);
  };

  const handleFormSubmit = (values: Credentials) => {
    const { url, username, password } = values;

    globalDispatch({
      type: 'CONNECT',
      credentials: {
        url,
        username,
        password,
      },
    });
  };

  return (
    <Flex
      flex={1}
      justify="center"
      align="center"
      marginBottom="4rem"
      padding="3rem"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Stack align="center" spacing={4}>
          <FormControl isInvalid={errors.url}>
            <FormLabel htmlFor="url" color="white">
              URL
            </FormLabel>

            <Input
              ref={register({ validate: validateUrl })}
              type="text"
              name="url"
              placeholder="URL"
            />

            <FormErrorMessage>
              {errors.url && errors.url.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={errors.username}>
            <FormLabel htmlFor="username" color="white">
              Username
            </FormLabel>

            <Input
              ref={register({ validate: validateUsername })}
              type="text"
              name="username"
              placeholder="Username"
            />

            <FormErrorMessage>
              {errors.username && errors.username.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={errors.password}>
            <FormLabel htmlFor="password" color="white">
              Password
            </FormLabel>

            <Input
              ref={register({ validate: validatePassword })}
              type="password"
              name="password"
              placeholder="Password"
            />

            <FormErrorMessage>
              {errors.password && errors.password.message}
            </FormErrorMessage>
          </FormControl>

          <Button
            type="submit"
            marginY="1rem"
            border="2px"
            bg="transparent"
            color="white"
            variantColor="purple"
            isLoading={formState.isSubmitting}
          >
            Log in
          </Button>
        </Stack>
      </form>
    </Flex>
  );
};

export default Login;
