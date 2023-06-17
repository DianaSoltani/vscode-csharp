/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getFakeVsCode } from "../testAssets/Fakes";
import reportIssue from "../../../src/features/reportIssue";
import { EventStream } from "../../../src/EventStream";
import TestEventBus from "../testAssets/TestEventBus";
import { expect } from "chai";
import { OpenURL } from "../../../src/omnisharp/loggingEvents";
import { vscode } from "../../../src/vscodeAdapter";
import { Options } from "../../../src/shared/options";
import { FakeGetDotnetInfo, fakeDotnetInfo } from "../Fakes/FakeGetDotnetInfo";
import { FakeMonoResolver, fakeMonoInfo } from "../Fakes/FakeMonoResolver";
import { FakeDotnetResolver } from "../Fakes/FakeDotnetResolver";

suite(`${reportIssue.name}`, () => {
    const vscodeVersion = "myVersion";
    const csharpExtVersion = "csharpExtVersion";
    const isValidForMono = true;
    let vscode: vscode;
    const extension1 = {
        packageJSON: {
            name: "name1",
            publisher: "publisher1",
            version: "version1",
            isBuiltin: true
        },
        id: "id1"
    };

    const extension2 = {
        packageJSON: {
            name: "name2",
            publisher: "publisher2",
            version: "version2",
            isBuiltin: false
        },
        id: "id2"
    };

    let fakeMonoResolver: FakeMonoResolver;
    let fakeDotnetResolver : FakeDotnetResolver;
    let eventStream: EventStream;
    let eventBus: TestEventBus;
    const getDotnetInfo = FakeGetDotnetInfo;
    let options: Options;
    let issueBody: string;

    setup(() => {
        vscode = getFakeVsCode();

        vscode.env.clipboard.writeText = async (body: string) => {
            issueBody = body;
            return Promise.resolve();
        };

        vscode.version = vscodeVersion;
        vscode.extensions.all = [extension1, extension2];
        eventStream = new EventStream();
        eventBus = new TestEventBus(eventStream);
        fakeMonoResolver = new FakeMonoResolver();
        fakeDotnetResolver = new FakeDotnetResolver();
    });

    test(`${OpenURL.name} event is created`, async () => {
        await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, isValidForMono, options, fakeDotnetResolver, fakeMonoResolver);
        const events = eventBus.getEvents();
        expect(events).to.have.length(1);
        expect(events[0].constructor.name).to.be.equal(`${OpenURL.name}`);
    });

    test(`${OpenURL.name} event is created with the omnisharp-vscode github repo issues url`, async () => {
        await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, false, options, fakeDotnetResolver, fakeMonoResolver);
        const url = (<OpenURL>eventBus.getEvents()[0]).url;
        expect(url).to.include("https://github.com/OmniSharp/omnisharp-vscode/issues/new?body=Please paste the output from your clipboard");
    });

    suite("The body is passed to the vscode clipboard and", () => {
        test("it contains the vscode version", async () => {
            await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, isValidForMono, options, fakeDotnetResolver, fakeMonoResolver);
            expect(issueBody).to.include(`**VSCode version**: ${vscodeVersion}`);
        });

        test("it contains the csharp extension version", async () => {
            await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, isValidForMono, options, fakeDotnetResolver, fakeMonoResolver);
            expect(issueBody).to.include(`**C# Extension**: ${csharpExtVersion}`);
        });

        test("it contains dotnet info", async () => {
            await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, isValidForMono, options, fakeDotnetResolver, fakeMonoResolver);
            expect(issueBody).to.contain(fakeDotnetInfo.FullInfo);
        });

        test("mono information is obtained when it is a valid mono platform", async () => {
            await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, isValidForMono, options, fakeDotnetResolver, fakeMonoResolver);
            expect(fakeMonoResolver.getMonoCalled).to.be.equal(true);
        });

        test("mono version is put in the body when it is a valid mono platform", async () => {
            await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, isValidForMono, options, fakeDotnetResolver, fakeMonoResolver);
            expect(fakeMonoResolver.getMonoCalled).to.be.equal(true);
            expect(issueBody).to.contain(fakeMonoInfo.version);
        });

        test("mono information is not obtained when it is not a valid mono platform", async () => {
            await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, false, options, fakeDotnetResolver, fakeMonoResolver);
            expect(fakeMonoResolver.getMonoCalled).to.be.equal(false);
        });

        test("The url contains the name, publisher and version for all the extensions that are not builtin", async () => {
            await reportIssue(vscode, csharpExtVersion, eventStream, getDotnetInfo, isValidForMono, options, fakeDotnetResolver, fakeMonoResolver);
            expect(issueBody).to.contain(extension2.packageJSON.name);
            expect(issueBody).to.contain(extension2.packageJSON.publisher);
            expect(issueBody).to.contain(extension2.packageJSON.version);
            expect(issueBody).to.not.contain(extension1.packageJSON.name);
            expect(issueBody).to.not.contain(extension1.packageJSON.publisher);
            expect(issueBody).to.not.contain(extension1.packageJSON.version);
        });
    });
});
