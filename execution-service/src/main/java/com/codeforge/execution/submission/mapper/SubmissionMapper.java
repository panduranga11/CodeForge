package com.codeforge.execution.submission.mapper;

import com.codeforge.execution.submission.dto.SubmissionResponse;
import com.codeforge.execution.submission.dto.TestResultResponse;
import com.codeforge.execution.submission.entity.Submission;
import com.codeforge.execution.submission.entity.SubmissionTestResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SubmissionMapper {

    @Mapping(target = "language", expression = "java(submission.getLanguage().name())")
    @Mapping(target = "verdict", expression = "java(submission.getVerdict().name())")
    @Mapping(target = "testResults", source = "testResults")
    SubmissionResponse toResponse(Submission submission);

    @Mapping(target = "testCaseId", source = "testCaseId")
    TestResultResponse toTestResultResponse(SubmissionTestResult result);

    List<TestResultResponse> toTestResultResponses(List<SubmissionTestResult> results);
}
