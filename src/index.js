import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import {
  Button,
  DisplayText,
  Paragraph,
  SectionHeading,
  TextInput,
  Textarea,
  FieldGroup,
  RadioButtonField,
  Form,
  SelectField,
  Option,
} from '@contentful/forma-36-react-components';
import { init, locations } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import '@contentful/forma-36-fcss/dist/styles.css';
import './index.css';

const App = ({ sdk }) => {
  const [templateName, setTemplateName] = useState(sdk.entry.fields.templateName.getValue());
  let [templateFields, setTemplateFields] = useState([]);

  const openNewEntry = async (type) => {
    const result = await sdk.navigator.openNewEntry(type, {
      slideIn: { waitForClose: true },
      localized: false,
    });

    await sdk.entry.fields.richText1.setValue({
      sys: {
        id: result.entity.sys.id,
        linkType: 'Entry',
        type: 'Link',
      },
    });
  };

  const openExistingEntry = async (type) => {
    await sdk.dialogs.selectSingleEntry({
      contentTypes: [type],
    });
  };

  const handleOnTemplateNameChange = async (event) => {
    const template = await sdk.space.getEntry(event.target.value);

    const fieldsInfo = await Promise.all(
      template.fields.fields['en-US'].map((field) => {
        return sdk.space.getEntry(field.sys.id);
      })
    );

    const scrubbedFields = fieldsInfo.map((field) => {
      return { title: field.fields.title['en-US'], fields: field.fields.fields['en-US'] };
    });

    setTemplateFields(scrubbedFields);
  };

  const Fields = () => {
    const templateElements = templateFields.map((field) => {
      const types = {
        'Rich Text': 'richText',
        CTA: 'callToAction',
        'Website Image': 'image',
      };

      return (
        <div className="fields-container">
          <h3>{field.title}</h3>
          {field.fields.map((field) => {
            return (
              <div className="fields-buttons-container">
                <Button
                  buttonType="primary"
                  icon="Plus"
                  onClick={() => openNewEntry(types[field])}
                  className="field-button">{`Create ${field} entry`}</Button>
                <Button
                  buttonType="primary"
                  icon="Plus"
                  onClick={() => openExistingEntry(types[field])}
                  className="field-button">{`Open ${field} entry`}</Button>
              </div>
            );
          })}
        </div>
      );
    });

    return templateElements;
    // fields.push(<button onClick={openNewEntry}>Create new entry</button>);
  };

  return (
    <Form className="f36-margin--l">
      <DisplayText>Gecko Template</DisplayText>
      <Paragraph>Select template name to display required fields</Paragraph>
      <SelectField
        name="optionSelect"
        id="optionSelect"
        labelText="Label"
        selectProps="large"
        onChange={(e) => handleOnTemplateNameChange(e)}>
        <Option value="1HgRR2JO1tvtnKgNaNqS4t">Ladder</Option>
        <Option value="1HgRR2JO1tvtnKgNaNqS4t">Sledge</Option>
      </SelectField>
      <Fields />
      {/* <SectionHeading>Title</SectionHeading>
        <TextInput
          testId="field-title"
          onChange={this.onTitleChangeHandler}
          value={this.state.title}
        />
        <SectionHeading>Body</SectionHeading>
        <Textarea testId="field-body" onChange={this.onBodyChangeHandler} value={this.state.body} />
        <SectionHeading>Has abstract?</SectionHeading>
        <FieldGroup row={false}>
          <RadioButtonField
            labelText="Yes"
            checked={this.state.hasAbstract === true}
            value="yes"
            onChange={this.onHasAbstractChangeHandler}
            name="abstractOption"
            id="yesCheckbox"
          />
          <RadioButtonField
            labelText="No"
            checked={this.state.hasAbstract === false}
            value="no"
            onChange={this.onHasAbstractChangeHandler}
            name="abstractOption"
            id="noCheckbox"
          />
          <button onClick={this.openNewEntry}>Open new entry</button>
        </FieldGroup> */}
      {/* {this.state.hasAbstract && (
          <React.Fragment>
            <SectionHeading>Abstract</SectionHeading>
            <Textarea
              testId="field-abstract"
              onChange={this.onAbstractChangeHandler}
              value={this.state.abstract}
            />
          </React.Fragment>
        )} */}
    </Form>
  );
};

init((sdk) => {
  console.log('sdk', sdk);
  if (sdk.location.is(locations.LOCATION_ENTRY_EDITOR)) {
    render(<App sdk={sdk} />, document.getElementById('root'));
  }
});

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
// if (module.hot) {
//   module.hot.accept();
// }
