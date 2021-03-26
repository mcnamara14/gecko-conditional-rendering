import React, { useEffect, useState } from 'react';
import { render } from 'react-dom';
import {
  Button,
  Form,
  SelectField,
  Subheading,
  TextInput,
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
  const [completedEntryIds, setCompletedEntryIds] = useState({
    parentIds: [],
    entryIds: [],
  });
  let [count, setCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(false);
  const [templateName, setTemplateName] = useState();
  const [variationId, setVariationId] = useState();
  const [internalName, setInternalName] = useState();

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
          console.log('template', variationEntry);

          if (variationEntry.fields.templateOptions) {
            const options = await getEntry(variationEntry.fields.templateOptions['en-US'][0]);

            for (const option of options.fields.options['en-US']) {
              const variationOption = await getEntry(option);
              console.log('variationOption', variationOption);
            }
          }

          const variationData = {
            name: variationEntry.fields.variation['en-US'],
            id: variationEntry.fields.section['en-US'].sys.id,
          };

          parentData.variations.push(variationData);
        }

        return parentData;
      })
    );

    const sortedTemplateData = templatesData.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    const name = await sdk.entry.fields['templateName'].getValue();
    const variationId = await sdk.entry.fields['variation'].getValue();
    const internalName = await sdk.entry.fields['internalName'].getValue();

    setTemplateName(name);
    setVariationId(variationId);
    setInternalName(internalName);
    setTemplateData(sortedTemplateData);

    if (count === 0) {
      setCount((count += 1));
    }
  };

  useEffect(() => {
    setTemplateDropdownData();

    if (count === 1) {
      templateName && handleNameSelect({ target: { value: templateName } });
      getCompletedEntryIds();
      setInitialLoad(true);
    }
  }, [count]);

  const getCompletedEntryIds = async () => {
    setCompletedEntryIds({
      parentIds: [],
      entryIds: [],
    });

    const fields = await sdk.entry.fields;
    const fieldNames = Object.keys(fields);
    const fieldValues = await Promise.all(
      fieldNames.map(async (fieldName) => {
        if (fieldName !== 'section' && fieldName !== 'templateName' && fieldName !== 'variation') {
          const fieldValue = await sdk.entry.fields[fieldName].getValue();

          if (Array.isArray(fieldValue)) {
            const arrays = await Promise.all(
              fieldValue.map(async (value) => {
                const entry = await getEntry(value?.sys?.id);
                let parentId = entry.fields.templateId && entry.fields.templateId['en-US'];

                if (value) {
                  const parentEntry = await getEntry(value);

                  const templateId =
                    parentEntry.fields.templateId && parentEntry.fields.templateId['en-US'];
                  const entryId = parentId;

                  return { templateId, entryId };
                }
              })
            );

            return arrays;
          }
        }
      })
    );

    const fieldIds = { parentIds: [], entryIds: [] };

    fieldValues.forEach((value) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            fieldIds.parentIds.push(item.templateId);
            fieldIds.entryIds.push(item.entryId);
          });
        } else {
          fieldIds.parentIds.push(value.templateId);
          fieldIds.entryIds.push(value.entryId);
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
              const entry = await getEntry(value);
              const templateId = entry.fields.templateId['en-US'];

              if (templateId === id) {
                await sdk.navigator.openEntry(entry.sys.id, {
                  slideIn: { waitForClose: true },
                });
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
      templateId: { ['en-US']: fields.templateId['en-US'] },
    };

    const clonedEntry = await sdk.space.createEntry(parentEntry.sys.contentType.sys.id, {
      fields: updatedFields,
    });

    const result = await sdk.navigator.openEntry(clonedEntry.sys.id, {
      slideIn: { waitForClose: true },
    });

    const templateId = result.entity.fields.templateId['en-US'];
    // const templateIdFieldId = `${parentEntry.sys.contentType.sys.id}IDs`;

    // setFieldValue(sdk.ids.entry, templateIdFieldId);
    setFieldValue(result.entity.sys.id, id);

    if (!completedEntryIds.parentIds.includes(templateId)) {
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

  const handleNameSelect = async (event, dropdownSelect) => {
    const value = event.target.value;
    const selectedTemplate = templateData.find((template) => {
      return template.name === value;
    });

    // variationEntry.fields.section['en-US'].sys.id
    setSelectedTemplateData(selectedTemplate.variations);
    handleVariationSelect({
      target: {
        value: dropdownSelect
          ? selectedTemplate.variations[0].id
          : variationId
          ? variationId
          : selectedTemplate.variations[0].id,
      },
    });

    const templateNameField = await sdk.entry.fields['templateName'];

    templateNameField.setValue(value);
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

    const getNestedOptions = (data) => {
      return data.map((entry) => {
        return {
          title: entry.fields.internalName['en-US'],
          id: entry.sys.id,
          contentType: entry.sys.contentType.sys.id,
          templateId: entry.fields.templateId['en-US'],
        };
      });
    };

    const getOptions = async (data) => {
      const options = await Promise.all(
        data.map(async (entry) => {
          const entryData = [];
          if (entry.sys.contentType.sys.id === 'section') {
            const columns = await getColumn(entry);

            for (const column of columns) {
              const data = {
                title: column.fields.internalName['en-US'],
                options: [],
                contentType: 'nested-row',
              };

              const itemEntries = await getEntries(column);
              const options = getNestedOptions(itemEntries);
              data.options = options;

              entryData.push(data);
            }

            return entryData;
          } else {
            return {
              title: entry.fields.internalName['en-US'],
              id: entry.sys.id,
              contentType: entry.sys.contentType.sys.id,
              templateId: entry.fields.templateId['en-US'],
            };
          }
        })
      );

      const formattedOptions = [];

      options.forEach((option) => {
        if (Array.isArray(option)) {
          option.forEach((item) => {
            formattedOptions.push(item);
          });
        } else {
          formattedOptions.push(option);
        }
      });

      return formattedOptions;
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

        const itemEntries = column.fields.items && (await getEntries(column));
        const options = itemEntries && (await getOptions(itemEntries));

        data.options = options;

        tree.push(data);
      }

      return tree;
    };

    const tree = await getTreeData(columns[0]);

    setTemplateFields(tree);
  };

  const deleteAllEntries = async () => {
    for (const id of completedEntryIds.entryIds) {
      const entry = await getEntry(id);
      await sdk.space.unpublishEntry(entry);
      await sdk.space.deleteEntry(entry);
    }

    const fields = await sdk.entry.fields;
    const fieldNames = Object.keys(fields);

    fieldNames.map(async (fieldName) => {
      if (fieldName !== 'templateName' && fieldName !== 'internalName') {
        await sdk.entry.fields[fieldName].setValue(null);
      }
    });

    setCompletedEntryIds({
      parentIds: [],
      entryIds: [],
    });
  };

  const handleInternalNameChange = async (event) => {
    await sdk.entry.fields['internalName'].setValue(event.target.value);
  };

  const handleVariationSelect = async (event) => {
    const variationTemplateId = event.target.value;
    // const variation = await getEntry(value);
    // const variationTemplateId = variation.fields.section['en-US'].sys.id;
    const variationTemplate = await getEntry(variationTemplateId);

    if (initialLoad) {
      deleteAllEntries();
    }
    await setFieldValue(variationTemplateId, 'section');
    buildSelectionTree(variationTemplate);

    const variationField = await sdk.entry.fields['variation'];

    variationField.setValue(variationTemplateId);
  };

  const getButton = (id, contentType, title, templateId) => {
    const addedEntry = completedEntryIds.parentIds.includes(templateId);
    const buttonClass = `field-button ${addedEntry ? 'completed-entry' : ''}`;

    return (
      <Button
        buttonType="primary"
        icon="PlusCircle"
        onClick={() => {
          addedEntry ? openEntry(templateId) : openExistingEntryClone(id, contentType);
        }}
        className={buttonClass}>
        {addedEntry ? 'Edit ' : 'Create '}
        {title}
      </Button>
    );
  };

  const Fields = () => {
    const templateElements = templateFields.map((field) => {
      return (
        <div className="fields-container">
          <h3>{field.title}</h3>
          {field?.options?.map((option) => {
            if (option.contentType === 'nested-row') {
              return (
                <div className="nested-fields-container">
                  <h4>{option.title}</h4>
                  {option.options.map((nestedOption) => {
                    return (
                      <div className="fields-buttons-container">
                        {getButton(
                          nestedOption.id,
                          nestedOption.contentType,
                          nestedOption.title,
                          nestedOption.templateId
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            } else {
              return (
                <div className="fields-buttons-container">
                  {getButton(option.id, option.contentType, option.title, option.templateId)}
                </div>
              );
            }
          })}
        </div>
      );
    });

    return templateElements;
  };
  console.log('selectedTemplateData', selectedTemplateData);
  return (
    <Form className="f36-margin--l">
      <Subheading className="subheading">Internal Name</Subheading>
      <TextInput
        className="internal-name-field"
        name="example"
        type="text"
        value={internalName}
        onChange={(e) => handleInternalNameChange(e)}
      />
      <SelectField
        name="optionSelect"
        id="optionSelect"
        labelText="Template Name"
        selectProps="large"
        value={templateName}
        onChange={(e) => handleNameSelect(e, true)}>
        <Option value={null}>Select Template</Option>
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
          value={variationId}
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
