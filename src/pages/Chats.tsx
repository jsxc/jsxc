import React, { useState } from 'react';
import {
  Flex,
  Stack,
  Heading,
  Text,
  Image,
  Avatar,
  AvatarBadge,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Textarea,
  IconButton,
} from '@chakra-ui/core';
import * as IonIcons from 'react-icons/io';
import * as FeatherIcons from 'react-icons/fi';
import { useXmpp, Thread } from '../hooks';

const Chats: React.FC = () => {
  const [globalState, globalDispatch] = useXmpp();
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  const {
    data: { threads },
  } = globalState;

  const handleThreadClick = (thread: Thread | null) => () => {
    setSelectedThread(thread);
  };

  return (
    <Flex flex={1}>
      <Stack
        flex={0.025}
        justify="space-between"
        align="center"
        padding="1em"
        background="#141419"
      >
        <Image
          src={require('../assets/images/logo.svg')}
          size="2rem"
          alt="JSXC logo"
        />

        <Avatar size="sm" name={'Viewer'}>
          <AvatarBadge size="1em" bg="green.500" borderWidth={2} />
        </Avatar>
      </Stack>

      <Stack flex={0.175} padding="1em" spacing="1.5em" background="#0e0e11">
        <InputGroup>
          <InputLeftElement
            children={<Icon name="search" color="gray.300" />}
          />

          <Input
            type="text"
            placeholder="Search"
            background="#343538"
            borderColor="#343538"
            color="gray.300"
          />
        </InputGroup>

        <Text
          fontSize="sm"
          fontWeight="bold"
          textTransform="uppercase"
          color="#747577"
        >
          Direct Messages
        </Text>

        <Stack spacing="0.75em">
          {threads.map((thread) => {
            const { contact } = thread;

            const contactName = contact.name ?? contact.jid;

            return (
              <Flex
                flex={1}
                align="center"
                key={contact.jid}
                onClick={handleThreadClick(thread)}
              >
                <Avatar marginRight="1em" size="sm" name={contactName}>
                  <AvatarBadge size="1em" bg="green.500" borderWidth={2} />
                </Avatar>

                <Text fontSize="1em" color="#747577">
                  {contactName}
                </Text>
              </Flex>
            );
          })}
        </Stack>
      </Stack>

      {selectedThread ? (
        <Stack flex={0.8} justify="space-between" background="#212328">
          <Stack>
            <Flex
              align="center"
              paddingX="1em"
              paddingY="1.5em"
              borderColor="gray.700"
              borderBottomWidth={1}
            >
              <Avatar
                marginRight="1em"
                size="sm"
                name={selectedThread.contact.name || selectedThread.contact.jid}
              >
                <AvatarBadge size="1em" bg="green.500" borderWidth={2} />
              </Avatar>

              <Text fontSize="lg" fontWeight="bold" color="gray.200">
                {selectedThread.contact.name || selectedThread.contact.jid}
              </Text>
            </Flex>
          </Stack>

          <Flex align="flex-end" padding="1em">
            <Textarea
              marginRight="0.5em"
              placeholder="Write a new message"
              background="#343538"
              borderColor="#343538"
              color="white"
              rounded={8}
            />

            <IconButton
              icon={() => <IonIcons.IoMdSend />}
              aria-label="Send message"
              background="#343538"
              color="white"
              variantColor="purple"
              rounded={8}
            />
          </Flex>
        </Stack>
      ) : (
        <Stack flex={0.8} justify="center" align="center" background="#212328">
          <FeatherIcons.FiMessageCircle size="8em" color="grey" />

          <Heading margin="0.5em" color="grey">
            No thread selected
          </Heading>
        </Stack>
      )}
    </Flex>
  );
};

export default Chats;
