import { useRef, useState } from 'react';
import {
  Table,
  ActionIcon,
  Text,
  Tooltip,
  Group,
  Button,
  rem,
  useMantineTheme,
  Flex,
  Center,
} from '@mantine/core';
import { useSession } from 'next-auth/react';
import { BankType, Client } from '@prisma/client';
import { notifications } from '@mantine/notifications';
import { IconX, IconTrash, IconDownload, IconCheck } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useRouter } from 'next/navigation';

import { Dropzone, FileRejection, MIME_TYPES } from '@mantine/dropzone';
import classes from './BankStatementsDragAndDrop.module.css';
import { SelectBankTypeDropdown } from '@/components/review/crud/SelectBankTypeDropdown/SelectBankTypeDropdown';
import CreateBankTypeButton from '@/components/banktype/crud/CreateBankTypeButton/CreateBankTypeButton';
import { useCreateReview } from '@/lib/actions/review';
import { generateUniqueFileName } from '@/lib/utils/helpers';

import { useRunModel } from '@/lib/actions/flask';

interface FormValues {
  bank_statements: BankStatement[];
}

interface BankStatement {
  client_company: string;
  name: string;
  type: string;
  file: File | null;
}

interface BankStatementsDragAndDropProps {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
}

export function BankStatementsDragAndDrop({
  selectedClient,
  setSelectedClient,
}: BankStatementsDragAndDropProps) {
  const theme = useMantineTheme();
  const openRef = useRef<() => void>(null);
  const form = useForm<FormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedBankTypes, setSelectedBankTypes] = useState<(BankType | null)[]>([]);
  const [isDropzoneEmpty, setIsDropzoneEmpty] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const [myData, setMyData] = useState<FormData | null>(null);

  const runModelMutation = useRunModel(
    async (data) => {
      notifications.update({
        id: 'model',
        color: 'teal',
        title: 'Running Model worked',
        message: 'The review has been created successfully.',
        icon: <IconCheck size={theme.fontSizes.md} />,
        loading: false,
        autoClose: 2000,
      });
    },
    // onError callback
    () => {
      notifications.update({
        id: 'review-create',
        color: 'red',
        title: 'Failed to run model',
        message: 'An error occurred. Please try again.',
        icon: <IconX size={theme.fontSizes.md} />,
        loading: false,
        autoClose: 2000,
      });
    }
  );

  const createReviewMutation = useCreateReview(
    // onSuccess callback
    async (data) => {
      form.reset();
      notifications.update({
        id: 'review-create',
        color: 'teal',
        title: 'Review was created',
        message: 'The review has been created successfully.',
        icon: <IconCheck size={theme.fontSizes.md} />,
        loading: false,
        autoClose: 2000,
      });
      router.push(`/reviews/${data.id}`);
      const response = await fetch(
        `${process.env.STARLETTE_API_URL}/process-csv?reviewId=${data.id}`,
        {
          method: 'POST',
          body: myData,
        }
      );
      const result = await response.json();
      console.log(result); // Handle the response based on your requirements
    },
    // onError callback
    () => {
      notifications.update({
        id: 'review-create',
        color: 'red',
        title: 'Failed to create review',
        message: 'An error occurred. Please try again.',
        icon: <IconX size={theme.fontSizes.md} />,
        loading: false,
        autoClose: 2000,
      });
    }
  );

  const handleDrop = (files: File[]) => {
    // Retrieve existing bank statements
    const existingBankStatements = form.values.bank_statements || [];

    // Map newly dropped files to bank statement objects
    const newBankStatements = files.map((file) => ({
      client_company: '',
      name: file.name,
      type: '',
      file,
    }));

    // Concatenate existing and new bank statements
    const updatedBankStatements = [...existingBankStatements, ...newBankStatements];

    // Update form values with the updated bank statements
    form.setFieldValue('bank_statements', updatedBankStatements);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    form.removeListItem('bank_statements', indexToRemove);
    const updatedBankStatements = form.values.bank_statements.filter(
      (_, idx) => idx !== indexToRemove
    );
    setIsDropzoneEmpty(
      updatedBankStatements.length === 0 ||
        updatedBankStatements.every((statement) => !statement.file)
    );
  };

  const handleBankTypeChange = (selectedBankType: BankType | null, index: number) => {
    setSelectedBankTypes((prevSelectedBankTypes) => {
      const updatedSelectedBankTypes = [...prevSelectedBankTypes];
      updatedSelectedBankTypes[index] = selectedBankType;
      return updatedSelectedBankTypes;
    });

    const updatedBankStatements = form.values.bank_statements.map((statement, i) => {
      if (i === index) {
        return { ...statement, type: selectedBankType?.name || '' };
      }
      return statement;
    });
    form.setFieldValue('bank_statements', updatedBankStatements);
    setIsDropzoneEmpty(updatedBankStatements.length === 0);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true); // Start submitting process
    const formData = new FormData();

    // Assuming you keep track of files in a state variable
    form.values.bank_statements.forEach((statement) => {
      if (statement.file) {
        formData.append('files[]', statement.file, `${statement.name}`);
      }
    });

    setMyData(formData);

    try {
      notifications.show({
        id: 'review-create',
        loading: true,
        title: 'Creating review',
        message: 'Please wait...',
        autoClose: false,
        withCloseButton: false,
      });

      console.log(formData);

      await runModelMutation.mutateAsync({
        reviewId: 'test',
        formData,
      });

      await createReviewMutation.mutate({
        name: generateUniqueFileName(),
        startDate: new Date(),
        endDate: new Date(),
        client: { connect: { id: selectedClient?.id || '' } },
        user: { connect: { email: session?.user?.email || '' } },
      });
      setIsSubmitting(false);
    } catch (error) {
      console.error('Failed to submit:', error);
      setIsSubmitting(false);
      setSubmitError('Failed to submit files. Please try again.');
    }
  };

  const selectedBankStatements =
    form.values.bank_statements?.map((statement, index) => (
      <Table.Tr key={index}>
        <Table.Td style={{ maxWidth: rem(400) }}>
          <Tooltip
            arrowOffset={50}
            arrowSize={5}
            withArrow
            position="top-start"
            label={statement.file ? `${statement.file.name}` : 'Unknown'}
          >
            <Text truncate="end">{statement.file ? `${statement.file.name}` : 'Unknown'}</Text>
          </Tooltip>
        </Table.Td>
        <Table.Td style={{ minWidth: rem(78) }}>
          <Text ta="center">
            {statement.file ? `${((statement.file.size / 1024) * 0.001).toFixed(2)} mb` : 'Unknown'}
          </Text>
        </Table.Td>
        <Table.Td style={{ minWidth: rem(57) }}>
          <SelectBankTypeDropdown
            onChange={(selectedBankType) => handleBankTypeChange(selectedBankType, index)}
          />
        </Table.Td>
        <Table.Td>
          <Center>
            <ActionIcon color="red" onClick={() => handleRemoveFile(index)}>
              <IconTrash size="1rem" />
            </ActionIcon>
          </Center>
        </Table.Td>
      </Table.Tr>
    )) || [];

  const isSubmitDisabled =
    isDropzoneEmpty ||
    form.values.bank_statements?.some((statement) => !statement.type) ||
    selectedBankTypes.some((type) => type === null);

  const emptyRows =
    !form.values.bank_statements || form.values.bank_statements.length === 0
      ? Array.from({ length: 4 }, (_, index) => (
          <Table.Tr key={index}>
            <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
              -
            </Table.Td>
          </Table.Tr>
        ))
      : [];

  const handleRejectedFiles = (fileRejections: FileRejection[]) => {
    fileRejections.forEach((fileRejection) => {
      if (fileRejection.errors[0].code === 'file-invalid-type') {
        notifications.show({
          color: 'red',
          title: 'Invalid File Type',
          message: `The file "${fileRejection.file.name}" is invalid. Please upload only .csv or .xls files.`,
          icon: <IconX size={theme.fontSizes.md} />,
          loading: false,
          autoClose: 6000,
        });
      } else if (fileRejection.errors[0].code === 'file-too-large') {
        notifications.show({
          color: 'red',
          title: 'File Size Exceeded',
          message: `The file "${fileRejection.file.name}" exceeds the size limit. File size must be less than 30MB.`,
          icon: <IconX size={theme.fontSizes.md} />,
          loading: false,
          autoClose: 5000,
        });
      }
    });
  };

  return (
    <div>
      <div className={classes.wrapper}>
        <Dropzone
          openRef={openRef}
          onDrop={handleDrop}
          onReject={handleRejectedFiles}
          className={classes.dropzone}
          radius="sm"
          accept={[MIME_TYPES.csv, MIME_TYPES.xls]}
          maxSize={30 * 1024 ** 2}
          style={{ borderStyle: 'dashed', borderWidth: 2, borderRadius: 10, color: 'dimgray' }}
        >
          <Group justify="center" pt="sm">
            <div style={{ height: rem(170), pointerEvents: 'none' }}>
              {/*Dropzone size */}
              <Group justify="center">
                <Dropzone.Accept>
                  <IconDownload
                    style={{ width: rem(50), height: rem(50) }}
                    color={theme.colors.blue[6]}
                    stroke={1.5}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX
                    style={{ width: rem(50), height: rem(50) }}
                    color={theme.colors.red[6]}
                    stroke={1.5}
                  />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconDownload style={{ width: rem(50), height: rem(50) }} stroke={1.5} />
                </Dropzone.Idle>
              </Group>
              <Text ta="center" fw={700} fz="lg" mt="lg">
                <Dropzone.Accept>Drop the Bank Statements</Dropzone.Accept>
                <Dropzone.Reject>
                  Incorrect file type or file size is more than 30mb{' '}
                </Dropzone.Reject>
                <Dropzone.Idle>Upload Bank Statements</Dropzone.Idle>
              </Text>
              <Text ta="center" fz="sm" mt="xs" c="dimmed" pb="sm">
                Drag&apos;n&apos;drop files here to upload. We can accept only <i>.csv</i> files
                that are less than 30mb in size.
              </Text>
            </div>
            <div>
              <Button
                className={classes.control}
                size="md"
                radius="xl"
                onClick={() => openRef.current?.()}
              >
                Select files
              </Button>
            </div>
          </Group>
        </Dropzone>
      </div>

      <Text pb={1} ta="center" fw={700} size="xl">
        Selected Bank Statements
      </Text>
      <Flex style={{ height: rem(200) }}>
        <Table.ScrollContainer minWidth={1130}>
          <Table striped stickyHeader highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Bank Statement</Table.Th>
                <Table.Th ta="center">File Size</Table.Th>
                <Table.Th ta="center">Bank Type</Table.Th>
                <Table.Th ta="center">Remove</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {selectedBankStatements.length > 0 ? selectedBankStatements : emptyRows}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Flex>
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        mb={5}
        justify="space-between"
        style={{ gap: '16px' }}
        pt="sm"
      >
        <CreateBankTypeButton />
        {isSubmitDisabled ? (
          <Tooltip
            label="Select a statement and ensure all have a bank type to enable submit."
            position="bottom"
            withArrow
          >
            <Button
              disabled={isSubmitDisabled}
              className={classes.submitButton}
              loading={isSubmitting}
            >
              Submit
            </Button>
          </Tooltip>
        ) : (
          <Button onClick={handleSubmit} className={classes.submitButton} loading={isSubmitting}>
            Submit
          </Button>
        )}
      </Flex>
    </div>
  );
}
