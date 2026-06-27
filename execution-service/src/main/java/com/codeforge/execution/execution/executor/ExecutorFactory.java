package com.codeforge.execution.execution.executor;

import com.codeforge.execution.shared.exception.UnsupportedLanguageException;
import com.codeforge.execution.submission.entity.Language;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ExecutorFactory {

    private final Map<Language, LanguageExecutor> executors;

    public ExecutorFactory(List<LanguageExecutor> executorList) {
        executors = executorList.stream()
                .collect(Collectors.toMap(LanguageExecutor::getLanguage, e -> e));
    }

    public LanguageExecutor getExecutor(Language language) {
        return Optional.ofNullable(executors.get(language))
                .orElseThrow(() -> new UnsupportedLanguageException(language.name()));
    }
}
