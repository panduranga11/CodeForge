package com.codeforge.contest.problem.mapper;

import com.codeforge.contest.problem.dto.ProblemResponse;
import com.codeforge.contest.problem.dto.TestCaseResponse;
import com.codeforge.contest.problem.entity.Problem;
import com.codeforge.contest.problem.entity.TestCase;
import com.codeforge.contest.problem.entity.TestCaseType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ProblemMapper {

    @Mapping(target = "contestId", source = "contest.id")
    @Mapping(target = "difficulty", expression = "java(problem.getDifficulty().name())")
    @Mapping(target = "category", expression = "java(problem.getCategory().name())")
    @Mapping(target = "status", expression = "java(problem.getStatus().name())")
    @Mapping(target = "sampleTestCases", expression = "java(toSampleTestCaseResponses(problem.getTestCases()))")
    ProblemResponse toResponse(Problem problem);

    @Mapping(target = "type", expression = "java(testCase.getType().name())")
    TestCaseResponse toTestCaseResponse(TestCase testCase);

    default List<TestCaseResponse> toSampleTestCaseResponses(List<TestCase> testCases) {
        if (testCases == null) return List.of();
        return testCases.stream()
                .filter(tc -> tc.getType() == TestCaseType.SAMPLE)
                .map(this::toTestCaseResponse)
                .toList();
    }
}
