import React, { useEffect, useState } from 'react';
import { render } from 'react-dom';
import {
  Button,
  DisplayText,
  Paragraph,
  Form,
  SelectField,
  Option,
} from '@contentful/forma-36-react-components';
import { init, locations } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import '@contentful/forma-36-fcss/dist/styles.css';
import './index.css';

const App = ({ sdk }) => {
  let [templateFields, setTemplateFields] = useState([]);
  const [templateData, setTemplateData] = useState([]);
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);
  const [completedEntryIds, setCompletedEntryIds] = useState([]);
  let [count, setCount] = useState(0);

  const getEntry = async (entry) => {
    if (entry.sys) {
      return await sdk.space.getEntry(entry?.sys?.id);
    } else {
      return await sdk.space.getEntry(entry);
    }
  };

  const setTemplateDropdownData = async () => {
    const templateParents = await sdk.space.getEntries({
      content_type: 'templateParent',
    });

    const templatesData = await Promise.all(
      templateParents.items.map(async (template) => {
        const parentData = {
          name: template.fields.name['en-US'],
          variations: [],
        };

        for (const variation of template.fields.variations['en-US']) {
          const variationEntry = await getEntry(variation);

          const variationData = {
            name: variationEntry.fields.name['en-US'],
            id: variationEntry.sys.id,
          };

          parentData.variations.push(variationData);
        }

        return parentData;
      })
    );

    setTemplateData(templatesData);
    if (count === 0) {
      setCount((count += 1));
    }
  };

  useEffect(() => {
    setTemplateDropdownData();

    if (count === 1) {
      handleNameSelect({ target: { value: templateData[0].name } });
      getCompletedEntryIds();
    }
  }, [count]);

  const getCompletedEntryIds = async () => {
    setCompletedEntryIds([]);

    const fields = await sdk.entry.fields;
    const fieldNames = Object.keys(fields);

    const fieldValues = await Promise.all(
      fieldNames.map(async (fieldName) => {
        if (fieldName !== 'section' && fieldName !== 'templateName') {
          const fieldValue = await sdk.entry.fields[fieldName].getValue();

          if (Array.isArray(fieldValue)) {
            const arrays = Promise.all(
              fieldValue.map(async (value) => {
                if (value) {
                  if (!completedEntryIds.includes(value?.sys?.id)) {
                    const parentEntry = await getEntry(value);
                    const templateEntryId = parentEntry.fields.templateEntryId['en-US'];

                    return templateEntryId;
                  }
                }
              })
            );

            return arrays;
          } else {
            if (fieldValue) {
              if (!completedEntryIds.includes(fieldValue?.sys?.id)) {
                const parentEntry = await getEntry(fieldValue);
                const templateEntryId = parentEntry.fields.templateEntryId['en-US'];

                return templateEntryId;
              }
            }
          }
        }
      })
    );

    const fieldIds = [];

    fieldValues.forEach((value) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          fieldIds.push(...value);
        } else {
          fieldIds.push(value);
        }
      }
    });

    setCompletedEntryIds(fieldIds);
  };

  const openEntry = async (id) => {
    const fields = await sdk.entry.fields;
    const fieldNames = Object.keys(fields);

    fieldNames.forEach(async (fieldName) => {
      if (fieldName !== 'section' && fieldName !== 'templateName') {
        const fieldValue = await sdk.entry.fields[fieldName].getValue();

        if (Array.isArray(fieldValue)) {
          fieldValue.forEach(async (value) => {
            if (value) {
              if (!completedEntryIds.includes(value?.sys?.id)) {
                const parentEntry = await getEntry(value);
                const templateEntryId = parentEntry.fields.templateEntryId['en-US'];

                if (templateEntryId === id) {
                  await sdk.navigator.openEntry(parentEntry.sys.id, {
                    slideIn: { waitForClose: true },
                  });
                }
              }
            }
          });
        }
      }
    });
  };

  const openExistingEntryClone = async (fieldId, id) => {
    const parentEntry = await getEntry(fieldId);

    const { fields } = parentEntry;
    const newFields = { ...fields };

    newFields.internalName['en-US'] = `${newFields.internalName['en-US']}`;

    const updatedFields = {
      ...newFields,
      templateEntryId: { ['en-US']: parentEntry.sys.id },
    };

    const clonedEntry = await sdk.space.createEntry(parentEntry.sys.contentType.sys.id, {
      fields: updatedFields,
    });

    const result = await sdk.navigator.openEntry(clonedEntry.sys.id, {
      slideIn: { waitForClose: true },
    });

    setFieldValue(result.entity.sys.id, id);

    if (!completedEntryIds.includes(result.entity.sys.id)) {
      getCompletedEntryIds();
    }
  };

  const getEntrySetValue = (id) => {
    return {
      sys: {
        id: id,
        linkType: 'Entry',
        type: 'Link',
      },
    };
  };

  const setFieldValue = async (sysId, id) => {
    const field = await sdk.entry.fields[id];
    const fieldValue = field.getValue();

    if (field.type === 'Link') {
      field.setValue(getEntrySetValue(sysId));
    } else if (Array.isArray(fieldValue)) {
      field.setValue([...fieldValue, getEntrySetValue(sysId)]);
    } else {
      field.setValue([getEntrySetValue(sysId)]);
    }
  };

  const handleNameSelect = (event) => {
    const selectedTemplate = templateData.find((template) => {
      return template.name === event.target.value;
    });

    setSelectedTemplateData(selectedTemplate.variations);
    handleVariationSelect({ target: { value: selectedTemplate.variations[0].id } });
  };

  const buildSelectionTree = async (variationTemplate) => {
    const getRows = async (data) => {
      return await Promise.all(
        data.fields.rows['en-US'].map((row) => {
          const rowId = row.sys.id;
          return getEntry(rowId);
        })
      );
    };

    const rows = await getRows(variationTemplate);

    const getColumns = async (data) => {
      return await Promise.all(
        data.map(async (row) => {
          const column = await getColumn(row);
          return column;
        })
      );
    };

    const getColumn = async (data) => {
      return Promise.all(
        data.fields.columns['en-US'].map((column) => {
          const columnId = column.sys.id;
          return getEntry(columnId);
        })
      );
    };

    const columns = await getColumns(rows);

    const getOptions = async (data) => {
      return Promise.all(
        data.map(async (entry) => {
          if (entry.sys.contentType.sys.id === 'section') {
            const columns = await getColumn(entry);

            for (const column of columns) {
              const data = {
                title: column.fields.internalName['en-US'],
                options: [],
                contentType: 'nested-row',
              };

              const itemEntries = await getEntries(column);
              const options = await getOptions(itemEntries);

              data.options = options;

              return data;
            }
          } else {
            return {
              title: entry.fields.internalName['en-US'],
              id: entry.sys.id,
              contentType: entry.sys.contentType.sys.id,
            };
          }
        })
      );
    };

    const getEntries = async (data) => {
      return Promise.all(
        data.fields.items['en-US'].map((item) => {
          const itemId = item.sys.id;
          return getEntry(itemId);
        })
      );
    };

    const getTreeData = async (columns) => {
      const tree = [];
      for (const column of columns) {
        const data = {
          title: column.fields.internalName['en-US'],
          options: [],
          contentType: 'row',
        };

        const itemEntries = await getEntries(column);
        const options = await getOptions(itemEntries);

        data.options = options;

        tree.push(data);
      }

      return tree;
    };

    const tree = await getTreeData(columns[0]);

    setTemplateFields(tree);
  };

  const handleVariationSelect = async (event) => {
    const variation = await getEntry(event.target.value);
    const variationTemplateId = variation.fields.section['en-US'].sys.id;
    const variationTemplate = await getEntry(variationTemplateId);

    await setFieldValue(variationTemplate.sys.id, 'section');

    buildSelectionTree(variationTemplate);
  };

  const Fields = () => {
    const templateElements = templateFields.map((field) => {
      return (
        <div className="fields-container">
          <h3>{field.title}</h3>
          {field.options.map((option) => {
            const addedEntry = completedEntryIds.includes(option.id);
            const buttonClass = `field-button ${addedEntry ? 'completed-entry' : ''}`;
            if (option.contentType === 'nested-row') {
              return (
                <div className="nested-fields-container">
                  <h4>{option.title}</h4>
                  {option.options.map((nestedOption) => {
                    const addedNestedEntry = completedEntryIds.includes(nestedOption.id);
                    const nestedButtonClass = `field-button ${
                      addedNestedEntry ? 'completed-entry' : ''
                    }`;

                    return (
                      <div className="fields-buttons-container">
                        <Button
                          buttonType="primary"
                          icon="PlusCircle"
                          onClick={() => {
                            addedNestedEntry
                              ? openEntry(nestedOption.id)
                              : openExistingEntryClone(nestedOption.id, nestedOption.contentType);
                          }}
                          className={nestedButtonClass}>
                          {addedNestedEntry ? 'Edit ' : 'Create '}
                          {nestedOption.title}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            } else {
              return (
                <div className="fields-buttons-container">
                  <Button
                    buttonType="primary"
                    icon="PlusCircle"
                    icon="PlusCircle"
                    onClick={() => {
                      addedEntry
                        ? openEntry(option.id)
                        : openExistingEntryClone(option.id, option.contentType);
                    }}
                    className={buttonClass}>
                    {addedEntry ? 'Edit ' : 'Create '}
                    {option.title}
                  </Button>
                </div>
              );
            }
          })}
        </div>
      );
    });

    return templateElements;
  };

  return (
    <Form className="f36-margin--l">
      <DisplayText>Gecko Template</DisplayText>
      <Paragraph>Select template name to display required fields</Paragraph>
      <SelectField
        name="optionSelect"
        id="optionSelect"
        labelText="Template Name"
        selectProps="large"
        onChange={(e) => handleNameSelect(e)}>
        {templateData.map((template) => {
          return <Option value={template.name}>{template.name}</Option>;
        })}
      </SelectField>
      {selectedTemplateData && (
        <SelectField
          name="optionSelect"
          id="optionSelect"
          labelText="Variation"
          selectProps="large"
          onChange={(e) => handleVariationSelect(e)}>
          {selectedTemplateData.map((variation) => {
            return <Option value={variation.id}>{variation.name}</Option>;
          })}
        </SelectField>
      )}
      <Fields />
    </Form>
  );
};

init((sdk) => {
  if (sdk.location.is(locations.LOCATION_ENTRY_EDITOR)) {
    render(<App sdk={sdk} />, document.getElementById('root'));
  }
});
