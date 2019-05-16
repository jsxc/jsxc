import { expect } from 'chai'
import 'mocha'

import Form from '@src/connection/Form'

const formType = 'form';
const title = 'Bot Configuration';
const instructions = 'Fill out this form to configure your new bot!';
const exampleXMLForm = $.parseXML(`<x xmlns='jabber:x:data' type='${formType}'>
    <title>${title}</title>
    <instructions>${instructions}</instructions>
    <field type='hidden' var='FORM_TYPE'>
        <value>jabber:bot</value>
    </field>
    <field type='fixed'>
        <value>Section 1: Bot Info</value>
    </field>
    <field type='text-single'
        label='The name of your bot'
        var='botname'/>
    <field type='text-multi'
        label='Helpful description of your bot'
        var='description'/>
    <field type='boolean'
        label='Public bot?'
        var='public'>
    <required/>
    </field>
    <field type='text-private'
        label='Password for special access'
        var='password'/>
    <field type='fixed'><value>Section 2: Features</value></field>
    <field type='list-multi'
        label='What features will the bot support?'
        var='features'>
        <option label='Contests'><value>contests</value></option>
        <option label='News'><value>news</value></option>
        <option label='Polls'><value>polls</value></option>
        <option label='Reminders'><value>reminders</value></option>
        <option label='Search'><value>search</value></option>
        <value>news</value>
        <value>search</value>
    </field>
    <field type='fixed'><value>Section 3: Subscriber List</value></field>
    <field type='list-single'
        label='Maximum number of subscribers'
        var='maxsubs'>
        <value>20</value>
        <option label='10'><value>10</value></option>
        <option label='20'><value>20</value></option>
        <option label='30'><value>30</value></option>
        <option label='50'><value>50</value></option>
        <option label='100'><value>100</value></option>
        <option label='None'><value>none</value></option>
        </field>
        <field type='fixed'><value>Section 4: Invitations</value></field>
        <field type='jid-multi'
            label='People to invite'
            var='invitelist'>
        <desc>Tell all your friends about your new bot!</desc>
    </field>
</x>`);

const exampleJSONForm = {
    type: formType,
    title,
    instructions,
    fields: [{
        type: 'hidden',
        name: 'FORM_TYPE',
        values: []
    }, {
        type: 'list-multi',
        name: 'features',
        values: ['news', 'search']
    }]
};

const exampleHTMLForm = $.parseHTML(`<form data-type="${formType}" autocomplete="off" class="form-horizontal">
    <h1>${title}</h1>
    <p>${instructions}</p>
    <div class="form-group jabber-x-data" data-type="hidden" data-name="FORM_TYPE">
        <input autocomplete="off" value="jabber:bot" type="hidden" name="FORM_TYPE" />
    </div>
    <div class="form-group">
        <div><p>Section 1: Bot Info</p></div>
    </div>
    <div class="form-group jabber-x-data" data-type="text-single" data-name="botname">
        <label for="botname" class="col-sm-4">The name of your bot</label>
        <input autocomplete="off" type="text" name="botname" id="botname" class="col-sm-8" />
    </div>
    <div class="form-group jabber-x-data" data-type="text-multi" data-name="description">
        <label for="description" class="col-sm-4">Helpful description of your bot</label>
        <textarea name="description" id="description" class="col-sm-8"></textarea>
    </div>
    <div class="form-group jabber-x-data" name="public" required="required" data-type="boolean" data-name="public">
        <div class="checkbox">
            <label class="col-sm-8 col-sm-offset-4"><input autocomplete="off" type="checkbox">Public bot?</label>
        </div>
    </div>
    <div class="form-group jabber-x-data" data-type="text-private" data-name="password">
        <label for="password" class="col-sm-4">Password for special access</label>
        <input autocomplete="new-password" type="password" name="password" id="password" class="col-sm-8" />
    </div>
    <div class="form-group">
        <div><p>Section 2: Features</p></div>
    </div>
    <div class="form-group jabber-x-data" data-type="list-multi" data-name="features">
        <label for="features" class="col-sm-4">What features will the bot support?</label>
        <select multiple="multiple" name="features" id="features" class="col-sm-8">
            <option value="contests">Contests</option>
            <option value="news" selected="selected">News</option>
            <option value="polls">Polls</option>
            <option value="reminders">Reminders</option>
            <option value="search" selected="selected">Search</option>
        </select>
    </div>
    <div class="form-group">
        <div><p>Section 3: Subscriber List</p></div>
    </div>
    <div class="form-group jabber-x-data" data-type="list-single" data-name="maxsubs">
        <label for="maxsubs" class="col-sm-4">Maximum number of subscribers</label>
        <select name="maxsubs" id="maxsubs" class="col-sm-8">
            <option value="10">10</option>
            <option value="20" selected="selected">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="none">None</option>
        </select>
    </div>
    <div class="form-group">
        <div><p>Section 4: Invitations</p></div>
    </div>
    <div class="form-group jabber-x-data" data-type="jid-multi" data-name="invitelist">
        <label for="invitelist" class="col-sm-4">People to invite</label>
        <textarea name="invitelist" id="invitelist" class="col-sm-8"></textarea>
    </div>
</form>`)[0];

describe('XEP-0004: Data Forms', function() {
    it('should parse a XML form', function() {
        let form = Form.fromXML(exampleXMLForm);

        expect(form.getType()).equals(formType);
        expect(form.getTitle()).equals(title);
        expect(form.getInstructions()).equals(instructions);
        expect(form.getValues('features')[0]).equals('news');
        expect(form.getValues('features')[1]).equals('search');
    });

    it('should parse a JSON form', function() {
        let form = Form.fromJSON(exampleJSONForm);

        expect(form.getType()).equals(formType);
        expect(form.getTitle()).equals(title);
        expect(form.getInstructions()).equals(instructions);
        expect(form.getValues('features')[0]).equals('news');
        expect(form.getValues('features')[1]).equals('search');
    });

    it('should parse a HTML form', function() {
        let form = Form.fromHTML(<Element> exampleHTMLForm);

        expect(form.getType()).equals('submit');
        expect(form.getValues('features')[0]).equals('news');
        expect(form.getValues('features')[1]).equals('search');
    });
});
