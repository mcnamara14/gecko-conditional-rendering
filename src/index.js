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
          const variationEntry = await sdk.space.getEntry(variation.sys.id);

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
  };

  useEffect(() => {
    setTemplateDropdownData();
    if (templateData.length > 0) {
      handleNameSelect({ target: { value: templateData[0].name } });
    }
  }, [templateData]);

  const openExistingEntry = async (fieldId, id) => {
    const parentEntry = await sdk.space.getEntry(fieldId);

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
  };

  const setFieldValue = async (sysId, id) => {
    const field = await sdk.entry.fields[id];
    const fieldValue = await sdk.entry.fields[id].getValue();

    if (field.type === 'Link') {
      await sdk.entry.fields[id].setValue({
        sys: {
          id: sysId,
          linkType: 'Entry',
          type: 'Link',
        },
      });
    } else {
      if (Array.isArray(fieldValue)) {
        await sdk.entry.fields[id].setValue([
          ...fieldValue,
          {
            sys: {
              id: sysId,
              linkType: 'Entry',
              type: 'Link',
            },
          },
        ]);
      } else {
        await sdk.entry.fields[id].setValue([
          {
            sys: {
              id: sysId,
              linkType: 'Entry',
              type: 'Link',
            },
          },
        ]);
      }
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
          return sdk.space.getEntry(rowId);
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
          return sdk.space.getEntry(columnId);
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
          return sdk.space.getEntry(itemId);
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
    const variation = await sdk.space.getEntry(event.target.value);
    const variationTemplateId = variation.fields.section['en-US'].sys.id;
    const variationTemplate = await sdk.space.getEntry(variationTemplateId);

    setFieldValue(variationTemplate.sys.id, 'section');

    buildSelectionTree(variationTemplate);
  };

  const Fields = () => {
    const templateElements = templateFields.map((field) => {
      return (
        <div className="fields-container">
          <h3>{field.title}</h3>
          {field.options.map((option) => {
            if (option.contentType === 'nested-row') {
              return (
                <div className="nested-fields-container">
                  <h4>{option.title}</h4>
                  {option.options.map((nestedOption) => {
                    return (
                      <div className="fields-buttons-container">
                        <Button
                          buttonType="primary"
                          icon="PlusCircle"
                          onClick={() =>
                            openExistingEntry(nestedOption.id, nestedOption.contentType)
                          }
                          className="field-button">{`Edit ${nestedOption.title}`}</Button>
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
                    onClick={() => openExistingEntry(option.id, option.contentType)}
                    className="field-button">{`Edit ${option.title}`}</Button>
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
