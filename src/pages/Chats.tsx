import React, { useState } from 'react';
import {
  PseudoBox,
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
import { useXmpp, Contact } from '../hooks';
import { formatTimestamp } from '../utilities';

const Chats: React.FC = () => {
  const [globalState] = useXmpp();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleContactClick = (contact: Contact) => () => {
    setSelectedContact(contact);
  };

  const {
    data: { contacts, threads },
  } = globalState;

  const selectedThread = selectedContact ? threads[selectedContact.jid] : null;

  return (
    <Flex flex={1} overflow="hidden">
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
          {contacts.map((contact) => {
            const contactName = contact.name ?? contact.jid;

            return (
              <PseudoBox
                rounded="md"
                cursor="pointer"
                _hover={{ backgroundColor: '#333' }}
                padding={2}
                key={contact.jid}
              >
                <Flex align="center" onClick={handleContactClick(contact)}>
                  <Avatar marginRight="1em" size="sm" name={contactName}>
                    <AvatarBadge size="1em" bg="green.500" borderWidth={2} />
                  </Avatar>

                  <Text
                    fontSize="1em"
                    color="#747577"
                    maxWidth="12em"
                    isTruncated={true}
                  >
                    {contactName}
                  </Text>
                </Flex>
              </PseudoBox>
            );
          })}
        </Stack>
      </Stack>

      {selectedContact ? (
        <Stack flex={0.8} justify="space-between" background="#212328">
          <Stack>
            <Flex
              align="center"
              paddingX="2em"
              paddingY="1.5em"
              borderColor="gray.700"
              borderBottomWidth={1}
            >
              <Avatar
                marginRight="1em"
                size="sm"
                name={selectedContact.name ?? selectedContact.jid}
              >
                <AvatarBadge size="1em" bg="green.500" borderWidth={2} />
              </Avatar>

              <Text fontSize="lg" fontWeight="bold" color="gray.200">
                {selectedContact.name ?? selectedContact.jid}
              </Text>
            </Flex>
          </Stack>

          <Stack paddingX="2em" overflow="auto">
            {selectedThread?.map((message) => {
              const { from, text, createdAt } = message;

              return (
                <Flex
                  flex={1}
                  paddingY="1em"
                  borderBottom="1px"
                  borderColor="gray.600"
                >
                  <Flex paddingRight="0.5em">
                    <Avatar marginRight="1em" size="sm" name={from} />
                  </Flex>

                  <Stack>
                    <Flex align="center">
                      <Text fontSize="md" fontWeight="bold" color="gray.200">
                        {from}
                      </Text>

                      <Text marginX="1em" fontSize="sm" color="gray.500">
                        {formatTimestamp('LT')(createdAt)}
                      </Text>
                    </Flex>

                    <Text fontSize="md" color="gray.400">
                      {text}
                    </Text>
                  </Stack>
                </Flex>
              );
            })}
          </Stack>

          <Flex flex={1} align="flex-end" padding="1em">
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
