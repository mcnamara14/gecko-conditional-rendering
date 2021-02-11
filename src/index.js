import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
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
import { template } from '@babel/core';

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
  }, []);

  const openNewEntry = async (type, id) => {
    const result = await sdk.navigator.openNewEntry(type, {
      slideIn: { waitForClose: true },
      localized: false,
    });

    setFieldValue(result.entity.sys.id, id);
  };

  const openExistingEntry = async (type, id) => {
    const result = await sdk.dialogs.selectSingleEntry({
      contentTypes: [type],
    });

    setFieldValue(result.sys.id, id);
  };

  const setFieldValue = async (sysId, id) => {
    await sdk.entry.fields[id].setValue({
      sys: {
        id: sysId,
        linkType: 'Entry',
        type: 'Link',
      },
    });
  };

  const handleNameSelect = (event) => {
    const selectedTemplate = templateData.find((template) => {
      return template.name === event.target.value;
    });

    setSelectedTemplateData(selectedTemplate.variations);
  };

  const handleVariationSelect = async (event) => {
    const variation = await sdk.space.getEntry(event.target.value);

    const fields = await Promise.all(
      variation.fields.fields['en-US'].map((field) => {
        return sdk.space.getEntry(field.sys.id);
      })
    );

    const scrubbedFields = await Promise.all(
      fields.map(async (field) => {
        const fieldData = { title: field.fields.title['en-US'], fields: [] };

        const fieldEntries = await Promise.all(
          field.fields.templateFields['en-US'].map(async (entry) => {
            const fieldEntry = await sdk.space.getEntry(entry.sys.id);

            return fieldEntry.sys.contentType.sys.id;
          })
        );
        fieldData.fields = fieldEntries;
        return fieldData;
      })
    );

    setTemplateFields(scrubbedFields);
  };

  const Fields = () => {
    const fieldCount = { richText: 0, 'Website Image': 0, CTA: 0 };
    const templateElements = templateFields.map((field) => {
      return (
        <div className="fields-container">
          <h3>{field.title}</h3>
          {field.fields.map((field) => {
            if (field === 'richText') {
              fieldCount['richText'] += 1;
            }
            const id = `${field}${fieldCount[field]}`;

            return (
              <div className="fields-buttons-container">
                <Button
                  buttonType="primary"
                  icon="Plus"
                  onClick={() => openNewEntry(field, id)}
                  className="field-button">{`Create ${field} entry`}</Button>
                <Button
                  buttonType="primary"
                  icon="Plus"
                  onClick={() => openExistingEntry(field, id)}
                  className="field-button">{`Open ${field} entry`}</Button>
              </div>
            );
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

        {/* <Option value="1HgRR2JO1tvtnKgNaNqS4t">Ladder</Option>
        <Option value="1HgRR2JO1tvtnKgNaNqS4t">Sledge</Option> */}
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
